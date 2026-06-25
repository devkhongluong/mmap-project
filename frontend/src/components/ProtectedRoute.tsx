import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Bảo vệ các route cần đăng nhập.
 * Nếu chưa có token → redirect về /login.
 */
export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
