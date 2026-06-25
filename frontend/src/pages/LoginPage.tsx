import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import AuthComponent from './AuthComponent'

/**
 * LoginPage — trang đăng nhập / đăng ký.
 * Wrap AuthComponent (đã có UI), kết nối vào useAuthStore.
 * Sau khi login thành công → redirect /dashboard.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const { login, register, isLoading, error, clearError } = useAuthStore()

  const handleLogin = async (email: string, password: string) => {
    await login(email, password)
    navigate('/dashboard', { replace: true })
  }

  const handleRegister = async (username: string, email: string, password: string) => {
    await register(username, email, password)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthComponent
      onLogin={handleLogin}
      onRegister={handleRegister}
      isLoading={isLoading}
      serverError={error}
      onClearError={clearError}
    />
  )
}
