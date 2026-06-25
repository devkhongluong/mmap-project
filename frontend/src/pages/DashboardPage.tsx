import { LoadingScreen } from '@/components/LoadingScreen'
import { useDashboard } from '@/hooks/useDashboard'
import DashboardComponent from './DashboardComponent'

/**
 * DashboardPage — trang học tập chính.
 *
 * Dùng useDashboard() hook để lấy toàn bộ state + actions từ store,
 * sau đó truyền xuống DashboardComponent qua props.
 *
 * DashboardComponent hiện tại vẫn dùng mock data nội bộ.
 * Khi sẵn sàng wire API thực, chỉ cần update DashboardComponent
 * để đọc từ props thay vì MOCK_MAPS.
 */
export function DashboardPage() {
  const dashboard = useDashboard()

  // Đang tải lần đầu — chưa có maps nào
  if (dashboard.isLoadingMaps && dashboard.maps.length === 0) {
    return <LoadingScreen message="Đang tải lộ trình học tập..." />
  }

  // Truyền toàn bộ dashboard state + actions xuống component
  return <DashboardComponent {...dashboard} />
}
