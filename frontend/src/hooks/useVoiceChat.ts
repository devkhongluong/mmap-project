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
  /** Text final + interim đã nhận được */
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
  // Lưu interim text gần nhất (khi thả phím có thể text chưa kịp chuyển sang final)
  const lastInterimRef = useRef("")
  // Tránh gửi 2 lần nếu onend fire sau stopAndSend
  const sentRef = useRef(false)

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  // ── TTS helper ──────────────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
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
  }, [])

  // ── Gửi câu hỏi lên AI ─────────────────────────────────────────────
  const askAI = useCallback(async (question: string) => {
    const q = question.trim()
    console.log("[VoiceChat] Sending to AI:", q)
    if (!q) { setState("idle"); return }
    setState("thinking")
    setErrorMsg("")
    try {
      const result = await askVoiceQuestion(q, context.dayTitle, context.phaseName, context.checklistItems)
      console.log("[VoiceChat] AI Response received:", result)
      setAnswer(result)
      setState("answered")
      // Đọc to câu trả lời
      speakText(result)
    } catch (err: any) {
      console.error("[VoiceChat] AI Error:", err)
      setErrorMsg(err?.message || "Không thể kết nối AI. Kiểm tra mạng và thử lại.")
      setState("error")
    }
  }, [context.dayTitle, context.phaseName, context.checklistItems, speakText])

  // ── Lấy toàn bộ text đã nói (gồm cả final & interim) ─────────────
  const getCombinedText = () => {
    const combined = (finalTextRef.current + " " + lastInterimRef.current).trim()
    return combined
  }

  // ── Bắt đầu ghi âm (giữ phím) ──────────────────────────────────────
  const startListening = useCallback(() => {
    if (recognitionRef.current) return

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setErrorMsg("Trình duyệt không hỗ trợ. Dùng Chrome hoặc Edge nhé!")
      setState("error"); return
    }

    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    finalTextRef.current = ""
    lastInterimRef.current = ""
    sentRef.current = false
    setTranscript("")
    setInterimTranscript("")
    setAnswer("")
    setErrorMsg("")

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "vi-VN"
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log("[VoiceChat] Mic started listening...")
      setState("listening")
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTextRef.current += result[0].transcript + " "
        } else {
          interim += result[0].transcript
        }
      }
      lastInterimRef.current = interim
      setTranscript(finalTextRef.current.trim())
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("[VoiceChat] Mic error:", event.error)
      if (event.error === "no-speech") {
        // không sao
      } else if (event.error === "not-allowed") {
        setErrorMsg("Chưa cấp quyền micro. Cho phép và thử lại.")
        setState("error")
      } else if (event.error !== "aborted") {
        setErrorMsg(`Lỗi mic: ${event.error}`)
        setState("error")
      }
    }

    recognition.onend = () => {
      console.log("[VoiceChat] Mic ended.")
      recognitionRef.current = null
      setInterimTranscript("")

      if (!sentRef.current) {
        sentRef.current = true
        const text = getCombinedText()
        if (text) {
          setTranscript(text)
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
    if (!recognitionRef.current && !finalTextRef.current && !lastInterimRef.current) return

    const text = getCombinedText()
    console.log("[VoiceChat] stopAndSend combined text:", text)
    sentRef.current = true

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    setInterimTranscript("")

    if (text) {
      setTranscript(text)
      askAI(text)
    } else {
      setState("idle")
    }
  }, [askAI])

  const speakAnswer = useCallback(() => { if (answer) speakText(answer) }, [answer, speakText])

  const clearAnswer = useCallback(() => {
    try { recognitionRef.current?.abort() } catch {}
    recognitionRef.current = null
    window.speechSynthesis?.cancel()
    finalTextRef.current = ""
    lastInterimRef.current = ""
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
