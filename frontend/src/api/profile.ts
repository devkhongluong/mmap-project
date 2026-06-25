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

// ── API Functions ─────────────────────────────────────────────────────

/** GET /api/me — Thông tin profile + skills */
export async function getProfile(): Promise<UserProfile> {
  const res = await apiClient.get<UserProfile>('/api/me')
  return res.data
}
