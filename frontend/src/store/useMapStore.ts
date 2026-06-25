import { create } from 'zustand'
import * as mapsApi from '@/api/maps'
import * as checklistsApi from '@/api/checklists'
import * as notesApi from '@/api/notes'
import * as todosApi from '@/api/todos'
import type { UserMap, DayDetail } from '@/api/maps'
import type { Todo } from '@/api/todos'
import type { NoteHistory } from '@/api/notes'

// ── State Interface ────────────────────────────────────────────────────

interface MapState {
  // Maps
  maps: UserMap[]
  activeMapId: number | null
  isLoadingMaps: boolean

  // Current day
  currentDay: DayDetail | null
  isLoadingDay: boolean

  // Todos
  todos: Todo[]
  isLoadingTodos: boolean

  // Note history
  noteHistory: NoteHistory[]

  // Error
  error: string | null

  // ── Actions ──
  fetchMaps: () => Promise<void>
  switchMap: (mapId: number, userMapId: number) => Promise<void>
  fetchCurrentDay: (mapId: number) => Promise<void>
  toggleChecklist: (checklistId: number) => Promise<void>
  saveNote: (mapDayId: number, noteContent: string) => Promise<void>
  fetchTodos: (date: string) => Promise<void>
  createTodo: (content: string, date: string, dueTime: string | null) => Promise<void>
  toggleTodo: (id: number) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
  fetchNoteHistory: (mapId: number) => Promise<void>
  clearError: () => void

  // Getters
  getActiveMap: () => UserMap | null
}

// ── Store ─────────────────────────────────────────────────────────────

/**
 * useMapStore — trạng thái học tập chính.
 * Không persist (data luôn fresh từ server sau mỗi lần login).
 */
export const useMapStore = create<MapState>((set, get) => ({
  maps: [],
  activeMapId: null,
  isLoadingMaps: false,
  currentDay: null,
  isLoadingDay: false,
  todos: [],
  isLoadingTodos: false,
  noteHistory: [],
  error: null,

  // ── Fetch danh sách Maps ─────────────────────────────────────────────
  fetchMaps: async () => {
    set({ isLoadingMaps: true, error: null })
    try {
      const maps = await mapsApi.getUserMaps()
      const activeMapId = maps.length > 0 ? maps[0].mapId : null
      set({ maps, activeMapId, isLoadingMaps: false })

      // Tự động tải ngày học của Active Map
      if (activeMapId) {
        get().fetchCurrentDay(activeMapId)
      }
    } catch (err) {
      set({ isLoadingMaps: false, error: (err as Error).message })
    }
  },

  // ── Chuyển đổi Active Map ────────────────────────────────────────────
  switchMap: async (mapId, userMapId) => {
    set({ activeMapId: mapId, currentDay: null })
    try {
      // Cập nhật last_accessed_at trên server
      await mapsApi.updateMapAccess(userMapId)
      await get().fetchCurrentDay(mapId)
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  // ── Lấy ngày học hiện tại ────────────────────────────────────────────
  fetchCurrentDay: async (mapId) => {
    set({ isLoadingDay: true, error: null })
    try {
      const day = await mapsApi.getCurrentDay(mapId)
      set({ currentDay: day, isLoadingDay: false })
    } catch (err) {
      set({ isLoadingDay: false, error: (err as Error).message })
    }
  },

  // ── Toggle Checkbox ───────────────────────────────────────────────────
  toggleChecklist: async (checklistId) => {
    try {
      const { isChecked } = await checklistsApi.toggleChecklist(checklistId)

      // Optimistic update — cập nhật state ngay lập tức, không đợi re-fetch
      set((state) => {
        if (!state.currentDay) return state
        const newChecklists = state.currentDay.checklists.map((c) =>
          c.checklistId === checklistId ? { ...c, isChecked } : c
        )
        const checkedCount = newChecklists.filter((c) => c.isChecked).length
        return {
          currentDay: {
            ...state.currentDay,
            checklists: newChecklists,
            checkedCount,
            allChecked: checkedCount === newChecklists.length && newChecklists.length > 0,
          },
        }
      })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  // ── Lưu Note & Hoàn thành ngày ──────────────────────────────────────
  saveNote: async (mapDayId, noteContent) => {
    await notesApi.saveNote(mapDayId, noteContent)
    // Sau khi lưu → reload maps để cập nhật progress + tree map
    await get().fetchMaps()
  },

  // ── Todos ────────────────────────────────────────────────────────────
  fetchTodos: async (date) => {
    set({ isLoadingTodos: true })
    try {
      const todos = await todosApi.getTodos(date)
      set({ todos, isLoadingTodos: false })
    } catch (err) {
      set({ isLoadingTodos: false, error: (err as Error).message })
    }
  },

  createTodo: async (content, date, dueTime) => {
    const todo = await todosApi.createTodo({
      taskContent: content,
      targetDate: date,
      dueTime,
    })
    set((state) => ({ todos: [...state.todos, todo] }))
  },

  toggleTodo: async (id) => {
    const updated = await todosApi.toggleTodo(id)
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updated : t)),
    }))
  },

  deleteTodo: async (id) => {
    await todosApi.deleteTodo(id)
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }))
  },

  // ── Note History ──────────────────────────────────────────────────────
  fetchNoteHistory: async (mapId) => {
    try {
      const history = await notesApi.getNoteHistory(mapId)
      set({ noteHistory: history })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  clearError: () => set({ error: null }),

  // ── Getters ──────────────────────────────────────────────────────────
  getActiveMap: () => {
    const { maps, activeMapId } = get()
    return maps.find((m) => m.mapId === activeMapId) ?? null
  },
}))
