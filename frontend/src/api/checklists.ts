import { apiClient } from './client'

/** PUT /api/checklists/{checklistId}/toggle */
export async function toggleChecklist(
  checklistId: number
): Promise<{ isChecked: boolean }> {
  const res = await apiClient.put<{ isChecked: boolean }>(
    `/api/checklists/${checklistId}/toggle`
  )
  return res.data
}
