import { LoadingScreen } from '@/components/LoadingScreen'
import { useDashboard } from '@/hooks/useDashboard'
import DashboardComponent from './DashboardComponent'

/**
 * DashboardPage — trang học tập chính.
 *
 * Dùng useDashboard() hook để lấy toàn bộ state + actions từ store,
 * sau đó truyền xuống DashboardComponent qua props.
 */
export function DashboardPage() {
  const dashboard = useDashboard()

  // Server đang cold-start → hiện màn hình chờ thân thiện
  if (dashboard.isServerWarming) {
    return (
      <LoadingScreen
        message="Đang kết nối đến máy chủ, vui lòng chờ..."
        isServerWarming={true}
        onRetry={dashboard.retryLoad}
      />
    )
  }

  // Đang tải lần đầu — chưa có maps nào
  if (dashboard.isLoadingMaps && dashboard.maps.length === 0) {
    return <LoadingScreen message="Đang tải lộ trình học tập..." />
  }

  // Truyền toàn bộ dashboard state + actions xuống component
  return <DashboardComponent {...dashboard} />
}
