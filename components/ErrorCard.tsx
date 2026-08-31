interface ErrorCardProps {
  agentId: string
  agentName: string
  errorMessage: string
  errorDetails: string
  timestamp: Date
  onRetry: () => void
  onViewLogs: () => void
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
        borderColor: '#ef4444' 
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

      {/* Error Details (expandable) */}
      <details className="text-xs mb-3">
        <summary 
          className="cursor-pointer hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Show details
        </summary>
        <pre 
          className="mt-2 p-2 rounded text-xs overflow-x-auto"
          style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#fca5a5' }}
        >
          {errorDetails}
        </pre>
      </details>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs font-medium rounded hover:opacity-80 transition-opacity"
          style={{ background: '#ef4444', color: 'white' }}
        >
          🔄 Retry
        </button>
        <button
          onClick={onViewLogs}
          className="px-3 py-1.5 text-xs font-medium rounded border hover:opacity-80 transition-opacity"
          style={{ borderColor: '#ef4444', color: '#ef4444' }}
        >
          📋 View Logs
        </button>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
