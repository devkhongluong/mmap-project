/**
 * Loading screen toàn trang — hiển thị khi app đang fetch data ban đầu.
 * Hỗ trợ chế độ "server warming" khi backend Render đang cold-start.
 */
export function LoadingScreen({
  message = 'Đang tải...',
  isServerWarming = false,
  onRetry,
}: {
  message?: string
  isServerWarming?: boolean
  onRetry?: () => void
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
      style={{ background: 'linear-gradient(135deg, #0F0F1A 0%, #1a1a2e 100%)' }}
    >
      {/* Spinner */}
      <div className="relative w-20 h-20">
        <svg
          className="w-20 h-20"
          viewBox="0 0 64 64"
          style={{ animation: 'spin 1.2s linear infinite' }}
        >
          <circle
            cx="32" cy="32" r="28"
            fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="6"
          />
          <path
            d="M32 4 A28 28 0 0 1 60 32"
            fill="none" stroke="#6366F1" strokeWidth="6" strokeLinecap="round"
          />
        </svg>
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
        />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          M
        </div>
        <span className="text-white font-bold text-xl">MMAP</span>
      </div>

      {/* Message */}
      <p className="text-gray-400 text-sm text-center max-w-xs">
        {message}
      </p>

      {/* Server warming info */}
      {isServerWarming && (
        <div className="flex flex-col items-center gap-4 mt-2 max-w-sm">
          <div
            className="rounded-2xl px-6 py-4 text-center border"
            style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}
          >
            <div className="text-2xl mb-2">☕</div>
            <p className="text-indigo-300 font-semibold text-sm mb-1">
              Máy chủ đang khởi động
            </p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Vì dùng gói miễn phí, máy chủ tự ngủ sau 15 phút không hoạt động và cần ~30-60 giây để thức dậy.
              <br />Hệ thống đang tự động thử lại cho bạn.
            </p>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}
            >
              🔄 Thử lại ngay
            </button>
          )}
        </div>
      )}

      {/* Animated dots indicator */}
      {!isServerWarming && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500"
              style={{
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
