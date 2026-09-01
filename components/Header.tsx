export default function Header({ connected }: { connected: boolean }) {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 border-b"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-11 h-11 text-white font-bold rounded-lg"
          style={{ background: 'var(--accent)' }}
        >
          AO
        </div>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Agent Ops
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Live Badge */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
          style={{
            background: connected
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(148, 163, 184, 0.1)',
            color: connected
              ? 'var(--status-running)'
              : 'var(--status-idle)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: connected ? 'var(--status-running)' : 'var(--status-idle)',
              animation: connected ? 'pulse 2s infinite' : 'none',
            }}
          ></span>
          {connected ? 'Live' : 'Offline'}
        </div>

        {/* Notification Bell — min 44px touch target (HIGH fix) */}
        <button
          className="relative w-11 h-11 rounded-full flex items-center justify-center hover:bg-[var(--bg-surface-hover)] transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ background: 'var(--status-error)' }}
          ></span>
        </button>

        {/* Avatar — min 44px (MEDIUM fix) */}
        <div
          className="flex items-center justify-center w-11 h-11 rounded-full text-white text-sm font-semibold"
          style={{ background: 'var(--accent)' }}
        >
          KN
        </div>
      </div>
    </header>
  )
}
