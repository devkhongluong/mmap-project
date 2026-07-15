import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

// Mở rộng type để hỗ trợ thuộc tính retry
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retryCount?: number
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * Axios instance dùng chung toàn app.
 * Tự động gắn JWT vào mọi request và xử lý 401.
 * Có retry logic để xử lý Render cold-start.
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s — đủ thời gian để Render thức dậy
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — gắn JWT ──────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mmap_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Retry count để response interceptor biết
    config._retryCount = config._retryCount ?? 0
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — retry + xử lý lỗi ──────────────────────────
const MAX_RETRIES = 3
const RETRY_DELAY_MS = [3000, 6000, 12000] // exponential backoff

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    // Token hết hạn hoặc không hợp lệ và đây không phải lỗi network
    // chỉ logout khi có response rõ ràng (không phải timeout / network error)
    if (error.response?.status === 401 && error.response?.data) {
      localStorage.removeItem('mmap_token')
      localStorage.removeItem('mmap_user')
      window.location.href = '/login'
      return Promise.reject(new Error('Phiên làm việc hết hạn, vui lòng đăng nhập lại.'))
    }

    // Retry khi lỗi mạng (server đang ngủ / cold-start) hoặc 5xx
    const isNetworkError = !error.response // timeout, CORS, kết nối bị từ chối
    const isServerError = error.response?.status >= 500

    if ((isNetworkError || isServerError) && config && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1
      const delay = RETRY_DELAY_MS[config._retryCount - 1] ?? 10000
      console.warn(`[API] Làn thử ${config._retryCount}/${MAX_RETRIES} sau ${delay / 1000}s... (${config.url})`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return apiClient(config)
    }

    // Trả về message lỗi thân thiện
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (isNetworkError
        ? 'Không thể kết nối đến máy chủ. Máy chủ có thể đang khởi động (mất ~30 giây). Vui lòng chờ...'
        : 'Đã xảy ra lỗi. Vui lòng thử lại.')
    return Promise.reject(new Error(message))
  }
)
