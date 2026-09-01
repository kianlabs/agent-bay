interface ErrorCardProps {
  agentId: string
  agentName: string
  errorMessage: string
  errorDetails: string
  timestamp: Date
  onRetry: () => void
  onViewLogs: () => void
}

function getTimeAgo(timestamp: Date): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function ErrorCard({
  agentId,
  agentName,
  errorMessage,
  errorDetails,
  timestamp,
  onRetry,
  onViewLogs,
}: ErrorCardProps) {
  const timeAgo = getTimeAgo(timestamp)

  return (
    <div
      className="mt-2 p-3 rounded-lg border"
      style={{
        background: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
      }}
    >
      {/* Error Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <div>
            <h4 className="text-sm font-semibold" style={{ color: '#ef4444' }}>
              Error Occurred
            </h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {timeAgo}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
        {errorMessage}
      </p>

      {/* Error Details — MEDIUM: overflow-hidden on pre */}
      <details className="text-xs mb-3">
        <summary
          className="cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
        >
          Show details
        </summary>
        <pre
          className="mt-2 p-2 text-xs overflow-x-auto overflow-hidden rounded"
          style={{ background: 'rgba(0, 0, 0, 0.3)', color: 'var(--text-secondary)' }}
        >
          {errorDetails}
        </pre>
      </details>

      {/* Actions — HIGH: py-2.5 min-h-[44px] */}
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-lg hover:opacity-80 transition-opacity flex items-center"
          style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
        >
          Retry
        </button>
        <button
          onClick={onViewLogs}
          className="px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-lg hover:opacity-80 transition-opacity flex items-center"
          style={{ background: 'rgba(139,148,158,0.1)', color: 'var(--text-secondary)' }}
        >
          View Logs
        </button>
      </div>
    </div>
  )
}
