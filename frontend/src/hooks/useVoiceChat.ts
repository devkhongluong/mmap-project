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
  transcript: string
  answer: string
  errorMsg: string
  startListening: () => void
  stopListening: () => void
  clearAnswer: () => void
  speakAnswer: () => void
  isSpeaking: boolean
}

export function useVoiceChat(context: VoiceChatContext): UseVoiceChatReturn {
  const [state, setState] = useState<VoiceState>("idle")
  const [transcript, setTranscript] = useState("")
  const [answer, setAnswer] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const askAI = useCallback(async (question: string) => {
    if (!question.trim()) { setState("idle"); return }
    setState("thinking")
    try {
      const result = await askVoiceQuestion(question, context.dayTitle, context.phaseName, context.checklistItems)
      setAnswer(result)
      setState("answered")
      speakText(result)
    } catch {
      setErrorMsg("Không thể kết nối AI. Kiểm tra mạng và thử lại.")
      setState("error")
    }
  }, [context.dayTitle, context.phaseName, context.checklistItems])

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setErrorMsg("Trình duyệt không hỗ trợ. Dùng Chrome hoặc Edge nhé!")
      setState("error"); return
    }
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "vi-VN"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => { setState("listening"); setTranscript(""); setAnswer(""); setErrorMsg("") }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      askAI(text)
    }
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") setState("idle")
      else if (event.error === "not-allowed") { setErrorMsg("Chưa cấp quyền micro. Cho phép và thử lại."); setState("error") }
      else { setErrorMsg(`Lỗi: ${event.error}`); setState("error") }
    }
    recognition.onend = () => { if (state === "listening") setState("idle") }
    recognitionRef.current = recognition
    recognition.start()
  }, [askAI, state])

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setState("idle") }, [])

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "vi-VN"; utterance.rate = 1.0
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const speakAnswer = useCallback(() => { if (answer) speakText(answer) }, [answer])

  const clearAnswer = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false); setTranscript(""); setAnswer(""); setErrorMsg(""); setState("idle")
  }, [])

  return { state, transcript, answer, errorMsg, startListening, stopListening, clearAnswer, speakAnswer, isSpeaking }
}

