/**
 * Loading screen toàn trang — hiển thị khi app đang fetch data ban đầu.
 */
export function LoadingScreen({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: '#0F0F1A' }}
    >
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <svg
          className="w-16 h-16"
          viewBox="0 0 64 64"
          style={{ animation: 'spin 1s linear infinite' }}
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
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
        />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          M
        </div>
        <span className="text-white font-bold text-lg">MAP</span>
      </div>

      <p className="text-gray-500 text-sm">{message}</p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
