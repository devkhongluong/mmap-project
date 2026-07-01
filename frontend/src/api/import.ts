import { apiClient } from './client'

export interface ImportResult {
  mapId: number
  message: string
}

/**
 * POST /api/maps/import — Upload file .xlsx tạo lộ trình học mới
 * @param file      File .xlsx
 * @param mapTitle  Tên lộ trình
 * @param mapDesc   Mô tả (optional)
 */
export async function importMap(
  file: File,
  mapTitle: string,
  mapDesc = ''
): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('mapTitle', mapTitle)
  formData.append('mapDesc', mapDesc)

  const res = await apiClient.post<ImportResult>('/api/maps/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
