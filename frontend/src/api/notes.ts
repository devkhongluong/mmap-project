import { apiClient } from './client'

// ── Types ────────────────────────────────────────────────────────────

export interface NoteHistory {
  noteId: number
  dayIndex: number
  dayTitle: string
  noteContent: string
  createdAt: string
}

// ── API Functions ─────────────────────────────────────────────────────

/** POST /api/notes — Lưu note + hoàn thành ngày học */
export async function saveNote(
  mapDayId: number,
  noteContent: string
): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/api/notes', {
    mapDayId,
    noteContent,
  })
  return res.data
}

/** GET /api/notes/{mapId} — Lịch sử note của map */
export async function getNoteHistory(mapId: number): Promise<NoteHistory[]> {
  const res = await apiClient.get<NoteHistory[]>(`/api/notes/${mapId}`)
  return res.data
}
