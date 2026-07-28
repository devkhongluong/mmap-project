import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { useKeepAlive } from '@/hooks/useKeepAlive'

/**
 * Root App component — chỉ chứa routing.
 *
 * Routes:
 *  /              → redirect về /dashboard
 *  /login         → Trang đăng nhập / đăng ký (public)
 *  /dashboard     → Trang chính (protected — cần JWT)
 */
export default function App() {
  // Ping backend mỗi 30s — giữ Render free tier luôn hoạt động
  useKeepAlive()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
