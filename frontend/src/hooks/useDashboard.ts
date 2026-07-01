import { useEffect, useCallback, useState } from 'react'
import { useMapStore } from '@/store/useMapStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { UserMap, DayDetail, ChecklistItem } from '@/api/maps'
import type { Todo } from '@/api/todos'
import type { NoteHistory } from '@/api/notes'
import { getProfile, type UserProfile } from '@/api/profile'

/**
 * useDashboard — hook trung tâm của Dashboard.
 *
 * Gộp tất cả state + actions từ useMapStore và useAuthStore,
 * trả về một object thuận tiện cho DashboardComponent sử dụng.
 *
 * Pattern này giúp DashboardComponent không phụ thuộc trực tiếp
 * vào store — dễ test và dễ swap sau này.
 */
export function useDashboard() {
  const { user, logout } = useAuthStore()

  const {
    maps,
    activeMapId,
    currentDay,
    isLoadingMaps,
    isLoadingDay,
    todos,
    isLoadingTodos,
    noteHistory,
    error,
    fetchMaps,
    switchMap,
    toggleChecklist,
    saveNote,
    fetchTodos,
    createTodo,
    toggleTodo,
    deleteTodo,
    fetchNoteHistory,
    getActiveMap,
    clearError,
  } = useMapStore()

  const today = new Date().toISOString().split('T')[0]
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Tải dữ liệu khi mount
  useEffect(() => {
    fetchMaps()
    fetchTodos(today)
    getProfile().then(setProfile).catch(console.error)
  }, [])

  // Chuyển đổi map
  const handleSwitchMap = useCallback(
    async (mapId: number, userMapId: number) => {
      await switchMap(mapId, userMapId)
    },
    [switchMap]
  )

  // Toggle checkbox
  const handleToggleChecklist = useCallback(
    async (checklistId: number) => {
      await toggleChecklist(checklistId)
    },
    [toggleChecklist]
  )

  // Lưu note + hoàn thành ngày
  const handleSaveNote = useCallback(
    async (mapDayId: number, noteContent: string) => {
      await saveNote(mapDayId, noteContent)
    },
    [saveNote]
  )

  // Tạo todo mới
  const handleCreateTodo = useCallback(
    async (content: string, dueTime: string | null) => {
      await createTodo(content, today, dueTime)
    },
    [createTodo, today]
  )

  // Refresh todos cho ngày khác (calendar picker)
  const handleFetchTodos = useCallback(
    (date: string) => fetchTodos(date),
    [fetchTodos]
  )

  // Lấy lịch sử note
  const handleFetchNoteHistory = useCallback(
    (mapId: number) => fetchNoteHistory(mapId),
    [fetchNoteHistory]
  )

  return {
    // Auth & Profile
    user,
    profile,
    logout,

    // Maps
    maps,
    activeMapId,
    activeMap: getActiveMap(),
    isLoadingMaps,
    fetchMaps,

    // Current day
    currentDay,
    isLoadingDay,

    // Todos
    todos,
    isLoadingTodos,

    // Note history
    noteHistory,

    // Error
    error,
    clearError,

    // Today date
    today,

    // Actions
    switchMap: handleSwitchMap,
    toggleChecklist: handleToggleChecklist,
    saveNote: handleSaveNote,
    fetchTodos: handleFetchTodos,
    createTodo: handleCreateTodo,
    toggleTodo,
    deleteTodo,
    fetchNoteHistory: handleFetchNoteHistory,
  }
}

// Re-export types for convenience
export type { UserMap, DayDetail, ChecklistItem, Todo, NoteHistory }
