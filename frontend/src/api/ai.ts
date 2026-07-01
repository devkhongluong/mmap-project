import { apiClient } from './client'

export const reviewNoteWithAi = async (noteContent: string): Promise<string> => {
  const response = await apiClient.post<{ feedback: string }>('/api/ai/review-note', {
    noteContent,
  })
  return response.data.feedback
}
