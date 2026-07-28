import { useState, useRef, useCallback, useEffect } from "react"
import { askVoiceQuestion } from "../api/ai"

interface VoiceChatContext {
  dayTitle: string
  phaseName: string
  checklistItems: string[]
}

type VoiceState = "idle" | "listening" | "thinking" | "answered" | "error"

interface UseVoiceChatReturn {
  state: VoiceState
  /** Text final đã nhận được */
  transcript: string
  /** Text đang nhận realtime (chưa final) */
  interimTranscript: string
  answer: string
  errorMsg: string
  /** Bắt đầu ghi âm (push-to-talk: keydown) */
  startListening: () => void
  /** Dừng + gửi AI (push-to-talk: keyup) */
  stopAndSend: () => void
  clearAnswer: () => void
  speakAnswer: () => void
  isSpeaking: boolean
}

export function useVoiceChat(context: VoiceChatContext): UseVoiceChatReturn {
  const [state, setState] = useState<VoiceState>("idle")
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [answer, setAnswer] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)

  const recognitionRef = useRef<any>(null)
  // Tích lũy toàn bộ text final trong khi giữ phím
  const finalTextRef = useRef("")
  // Tránh gửi 2 lần nếu onend fire sau stopAndSend
  const sentRef = useRef(false)

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  // ── Gửi câu hỏi lên AI ─────────────────────────────────────────────
  const askAI = useCallback(async (question: string) => {
    const q = question.trim()
    if (!q) { setState("idle"); return }
    setState("thinking")
    try {
      const result = await askVoiceQuestion(q, context.dayTitle, context.phaseName, context.checklistItems)
      setAnswer(result)
      setState("answered")
    } catch {
      setErrorMsg("Không thể kết nối AI. Kiểm tra mạng và thử lại.")
      setState("error")
    }
  }, [context.dayTitle, context.phaseName, context.checklistItems])

  // ── Bắt đầu ghi âm (giữ phím) ──────────────────────────────────────
  const startListening = useCallback(() => {
    // Nếu đang nghe rồi thì không start lại
    if (recognitionRef.current) return

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setErrorMsg("Trình duyệt không hỗ trợ. Dùng Chrome hoặc Edge nhé!")
      setState("error"); return
    }

    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    finalTextRef.current = ""
    sentRef.current = false
    setTranscript("")
    setInterimTranscript("")
    setAnswer("")
    setErrorMsg("")

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "vi-VN"
    recognition.continuous = true       // ← Tiếp tục nghe không dừng giữa chừng
    recognition.interimResults = true   // ← Hiện chữ realtime khi đang nói
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setState("listening")
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      // Duyệt tất cả kết quả từ resultIndex hiện tại
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          // Tích lũy vào final text
          finalTextRef.current += result[0].transcript + " "
          setTranscript(finalTextRef.current.trim())
        } else {
          interim += result[0].transcript
        }
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        // Không sao — user chưa nói gì
      } else if (event.error === "not-allowed") {
        setErrorMsg("Chưa cấp quyền micro. Cho phép và thử lại.")
        setState("error")
      } else if (event.error !== "aborted") {
        setErrorMsg(`Lỗi mic: ${event.error}`)
        setState("error")
      }
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setInterimTranscript("")
      // Nếu chưa gửi (onend fire tự nhiên) → gửi luôn
      if (!sentRef.current) {
        const text = finalTextRef.current.trim()
        if (text) {
          sentRef.current = true
          askAI(text)
        } else {
          setState("idle")
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [askAI])

  // ── Dừng ghi âm + gửi AI (thả phím) ───────────────────────────────
  const stopAndSend = useCallback(() => {
    if (!recognitionRef.current) return

    const text = finalTextRef.current.trim()
    sentRef.current = true

    // Dừng recognition — onend sẽ fire nhưng sentRef = true nên không gửi lại
    recognitionRef.current.stop()
    recognitionRef.current = null
    setInterimTranscript("")

    if (text) {
      setTranscript(text)
      askAI(text)
    } else {
      // User giữ phím nhưng không nói gì
      setState("idle")
    }
  }, [askAI])

  // ── TTS ─────────────────────────────────────────────────────────────
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    // Ưu tiên giọng neural tiếng Việt nếu có (Edge)
    const voices = window.speechSynthesis.getVoices()
    const viVoice = voices.find(v =>
      v.lang.startsWith("vi") && (v.name.includes("Neural") || v.name.includes("HoaiMy") || v.name.includes("NamMinh"))
    ) || voices.find(v => v.lang.startsWith("vi"))
    if (viVoice) utterance.voice = viVoice
    utterance.lang = "vi-VN"
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const speakAnswer = useCallback(() => { if (answer) speakText(answer) }, [answer])

  const clearAnswer = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    window.speechSynthesis?.cancel()
    finalTextRef.current = ""
    sentRef.current = false
    setIsSpeaking(false)
    setTranscript("")
    setInterimTranscript("")
    setAnswer("")
    setErrorMsg("")
    setState("idle")
  }, [])

  return {
    state,
    transcript,
    interimTranscript,
    answer,
    errorMsg,
    startListening,
    stopAndSend,
    clearAnswer,
    speakAnswer,
    isSpeaking,
  }
}
