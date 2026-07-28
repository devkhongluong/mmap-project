import { useEffect, useRef } from "react"

const PING_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080") + "/api/ping"
const INTERVAL_MS = 30_000  // 30 giây

/**
 * useKeepAlive — Ping backend mỗi 30 giây để Render free tier không ngủ.
 *
 * Cách dùng: gọi hook này 1 lần ở component root (App hoặc DashboardPage).
 * Hook tự dừng khi component unmount.
 */
export function useKeepAlive() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const ping = () => {
      fetch(PING_URL, { method: "GET", cache: "no-store" })
        .then(() => console.debug("[KeepAlive] ping ok"))
        .catch(() => console.debug("[KeepAlive] ping failed (server may be starting)"))
    }

    // Ping ngay lập tức 1 lần khi mount
    ping()

    // Sau đó ping định kỳ mỗi 30s
    timerRef.current = setInterval(ping, INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])
}
