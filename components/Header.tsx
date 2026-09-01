import NotificationBell from './NotificationBell'

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

        {/* Notification Bell */}
        <NotificationBell />

        {/* Avatar */}
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
