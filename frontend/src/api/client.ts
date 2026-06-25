import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * Axios instance dùng chung toàn app.
 * Tự động gắn JWT vào mọi request và xử lý 401.
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — gắn JWT ───────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mmap_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — xử lý lỗi toàn cục ──────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token hết hạn hoặc không hợp lệ → đăng xuất và về trang login
    if (error.response?.status === 401) {
      localStorage.removeItem('mmap_token')
      localStorage.removeItem('mmap_user')
      window.location.href = '/login'
    }
    // Trả về message lỗi từ backend (GlobalExceptionHandler format)
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Đã xảy ra lỗi. Vui lòng thử lại.'
    return Promise.reject(new Error(message))
  }
)
