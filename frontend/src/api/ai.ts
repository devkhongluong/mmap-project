import { apiClient } from './client'

export const reviewNoteWithAi = async (noteContent: string): Promise<string> => {
  const response = await apiClient.post<{ feedback: string }>('/api/ai/review-note', {
    noteContent,
  })
  return response.data.feedback
}

export const askVoiceQuestion = async (
  question: string,
  dayTitle: string,
  phaseName: string,
  checklistItems: string[]
): Promise<string> => {
  const response = await apiClient.post<{ answer: string }>('/api/ai/voice-chat', {
    question,
    dayTitle,
    phaseName,
    checklistItems,
  })
  return response.data.answer
}
