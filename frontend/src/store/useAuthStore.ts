import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authApi from '@/api/auth'

// ── Types ─────────────────────────────────────────────────────────────

interface AuthUser {
  email: string
  username: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
  isAuthenticated: () => boolean
}

// ── Store ─────────────────────────────────────────────────────────────

/**
 * useAuthStore — quản lý trạng thái xác thực toàn cục.
 * Dùng `persist` middleware để lưu token vào localStorage.
 * Token tự được đọc bởi Axios interceptor trong api/client.ts.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const data = await authApi.login({ email, password })
          localStorage.setItem('mmap_token', data.accessToken)
          set({
            token: data.accessToken,
            user: { email: data.email, username: data.username },
            isLoading: false,
          })
        } catch (err) {
          set({
            isLoading: false,
            error: (err as Error).message,
          })
          throw err
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const data = await authApi.register({ username, email, password })
          localStorage.setItem('mmap_token', data.accessToken)
          set({
            token: data.accessToken,
            user: { email: data.email, username: data.username },
            isLoading: false,
          })
        } catch (err) {
          set({
            isLoading: false,
            error: (err as Error).message,
          })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('mmap_token')
        localStorage.removeItem('mmap_user')
        set({ token: null, user: null, error: null })
      },

      clearError: () => set({ error: null }),

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'mmap-auth',                          // Key trong localStorage
      partialize: (state) => ({                   // Chỉ persist token + user, không persist error/loading
        token: state.token,
        user: state.user,
      }),
    }
  )
)
