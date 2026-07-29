import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Kiểm tra JWT còn hạn không bằng cách decode payload (không cần verify chữ ký).
 * Nếu hết hạn → clear auth ngay, không cần gọi API để biết.
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // exp là Unix timestamp (giây), Date.now() là milliseconds
    return payload.exp * 1000 < Date.now()
  } catch {
    return true // Token malformed → coi như hết hạn
  }
}

/**
 * Bảo vệ các route cần đăng nhập.
 * - Nếu chưa có token → redirect về /login
 * - Nếu token hết hạn → auto-logout + redirect về /login
 */
export function ProtectedRoute() {
  const { token, logout } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />

  if (isTokenExpired(token)) {
    // Token hết hạn → clear state trước khi redirect
    logout()
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
