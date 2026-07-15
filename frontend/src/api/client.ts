import axios from 'axios'

// Mở rộng type để hỗ trợ thuộc tính retry
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retryCount?: number
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * Axios instance dùng chung toàn app.
 * - Tự động gắn JWT vào mọi request
 * - Xử lý 401 (token hết hạn): clear TOÀN BỘ auth storage và redirect về /login
 * - Retry tự động khi lỗi mạng / server cold-start (Render free tier)
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s — đủ thời gian để Render thức dậy sau cold-start
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — gắn JWT ──────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mmap_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    config._retryCount = config._retryCount ?? 0
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — xử lý 401 + retry cold-start ────────────────
const MAX_RETRIES = 3
const RETRY_DELAY_MS = [3000, 6000, 12000] // exponential backoff

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    // ── 401: Token hết hạn / không hợp lệ ─────────────────────────────
    // Clear TOÀN BỘ auth data: cả mmap_token, mmap_user, và mmap-auth (Zustand persist key)
    // Nếu thiếu mmap-auth, Zustand vẫn giữ token cũ → user không bị logout thật sự
    if (error.response?.status === 401) {
      localStorage.removeItem('mmap_token')
      localStorage.removeItem('mmap_user')
      localStorage.removeItem('mmap-auth') // ← QUAN TRỌNG: key của Zustand persist
      window.location.replace('/login')    // replace để không thể nhấn Back quay lại
      return Promise.reject(new Error('Phiên làm việc hết hạn. Vui lòng đăng nhập lại.'))
    }

    // ── Retry khi lỗi mạng hoặc 5xx (server cold-start) ───────────────
    const isNetworkError = !error.response // timeout, CORS, connection refused
    const isServerError = error.response?.status >= 500

    if ((isNetworkError || isServerError) && config && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1
      const delay = RETRY_DELAY_MS[config._retryCount - 1] ?? 10000
      console.warn(`[API] Thử lại lần ${config._retryCount}/${MAX_RETRIES} sau ${delay / 1000}s... (${config.url})`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return apiClient(config)
    }

    // ── Trả về message lỗi thân thiện ─────────────────────────────────
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (isNetworkError
        ? 'Không thể kết nối đến máy chủ. Máy chủ có thể đang khởi động (~30 giây). Vui lòng chờ...'
        : 'Đã xảy ra lỗi. Vui lòng thử lại.')
    return Promise.reject(new Error(message))
  }
)
