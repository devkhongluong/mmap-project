import { apiClient } from './client'

// ── Types ────────────────────────────────────────────────────────────

export interface ProfileSkill {
  skillId: number
  skillName: string
  iconUrl: string
  unlockedAt: string
}

export interface UserProfile {
  userId: number
  username: string
  email: string
  createdAt: string
  totalMapsEnrolled: number
  totalDaysCompleted: number
  currentStreak: number
  skills: ProfileSkill[]
}

export interface GroqKeyStatus {
  hasKey: boolean
  maskedKey: string
}

// ── API Functions ─────────────────────────────────────────────────────

/** GET /api/me — Thông tin profile + skills */
export async function getProfile(): Promise<UserProfile> {
  const res = await apiClient.get<UserProfile>('/api/me')
  return res.data
}

/** GET /api/me/groq-key — Kiểm tra user đã cài key chưa */
export async function getGroqKeyStatus(): Promise<GroqKeyStatus> {
  const res = await apiClient.get<GroqKeyStatus>('/api/me/groq-key')
  return res.data
}

/** PUT /api/me/groq-key — Lưu key mới */
export async function saveGroqKey(apiKey: string): Promise<void> {
  await apiClient.put('/api/me/groq-key', { apiKey })
}

/** DELETE /api/me/groq-key — Xoá key, dùng server key */
export async function deleteGroqKey(): Promise<void> {
  await apiClient.delete('/api/me/groq-key')
}

