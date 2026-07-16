import { apiClient } from './client'

// ── Types ────────────────────────────────────────────────────────────

export type DayProgressStatus = 'LOCKED' | 'UNLOCKED' | 'COMPLETED'
export type UserMapStatus = 'IN_PROGRESS' | 'COMPLETED'

export interface TreeNode {
  mapDayId: number
  dayIndex: number
  dayTitle: string
  phaseName: string
  status: DayProgressStatus
}

export interface UserMap {
  userMapId: number
  mapId: number
  title: string
  description: string
  totalDays: number
  daysCompleted: number
  currentDayIndex: number
  progressPct: number
  status: UserMapStatus
  lastAccessedAt: string
  startedAt: string
  treeNodes: TreeNode[]
}

export interface ChecklistItem {
  checklistId: number
  checkpointContent: string
  displayOrder: number
  isChecked: boolean
}

export interface MaterialItem {
  materialId: number
  title: string
  /** "text" | "link" | "youtube" */
  contentType: string
  content: string
  displayOrder: number
}

export interface DayDetail {
  mapDayId: number
  dayIndex: number
  dayTitle: string
  phaseName: string
  weekName: string | null
  checklists: ChecklistItem[]
  totalChecklists: number
  checkedCount: number
  allChecked: boolean
  dayCompleted: boolean
  materials: MaterialItem[]
}

// ── API Functions ─────────────────────────────────────────────────────

/** GET /api/maps — Danh sách lộ trình của user (index 0 = Active Map) */
export async function getUserMaps(): Promise<UserMap[]> {
  const res = await apiClient.get<UserMap[]>('/api/maps')
  return res.data
}

/** GET /api/maps/{mapId}/days/current — Ngày học hiện tại */
export async function getCurrentDay(mapId: number): Promise<DayDetail> {
  const res = await apiClient.get<DayDetail>(`/api/maps/${mapId}/days/current`)
  return res.data
}

/** PUT /api/maps/{userMapId}/access — Cập nhật Active Map */
export async function updateMapAccess(userMapId: number): Promise<void> {
  await apiClient.put(`/api/maps/${userMapId}/access`)
}
