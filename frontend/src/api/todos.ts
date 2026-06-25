import { apiClient } from './client'

// ── Types ────────────────────────────────────────────────────────────

export type TodoStatus = 'PENDING' | 'COMPLETED'

export interface Todo {
  id: number
  taskContent: string
  targetDate: string        // 'YYYY-MM-DD'
  dueTime: string | null    // ISO timestamp hoặc null = "Cả ngày"
  status: TodoStatus
  done: boolean
}

export interface CreateTodoPayload {
  taskContent: string
  targetDate: string
  dueTime: string | null
}

// ── API Functions ─────────────────────────────────────────────────────

/** GET /api/todos?date=2026-06-25 */
export async function getTodos(date: string): Promise<Todo[]> {
  const res = await apiClient.get<Todo[]>('/api/todos', { params: { date } })
  return res.data
}

/** POST /api/todos */
export async function createTodo(payload: CreateTodoPayload): Promise<Todo> {
  const res = await apiClient.post<Todo>('/api/todos', payload)
  return res.data
}

/** PUT /api/todos/{id}/toggle */
export async function toggleTodo(id: number): Promise<Todo> {
  const res = await apiClient.put<Todo>(`/api/todos/${id}/toggle`)
  return res.data
}

/** DELETE /api/todos/{id} */
export async function deleteTodo(id: number): Promise<void> {
  await apiClient.delete(`/api/todos/${id}`)
}
