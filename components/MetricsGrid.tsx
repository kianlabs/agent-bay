interface Metrics {
  tasksCompletedToday: number
  tasksInProgress: number
  prsReviewed: number
  buildStatus: string
  lastBuildTime: string
  testsPassed: number
  testsFailed: number
}

export default function MetricsGrid({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null

  const testTotal = metrics.testsPassed + metrics.testsFailed
  const testPercentage = testTotal > 0 
    ? Math.round((metrics.testsPassed / testTotal) * 100) 
    : 0

  return (
    <section className="px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Tasks Completed Today */}
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
            Tasks Completed
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.tasksCompletedToday}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {metrics.tasksInProgress} in progress
            </div>
          </div>
        </div>

        {/* Build Status */}
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
            Build Status
          </div>
          <div className="flex items-baseline gap-2">
            <div 
              className="text-2xl font-bold capitalize"
              style={{ 
                color: metrics.buildStatus === 'passing' 
                  ? 'var(--status-running)' 
                  : 'var(--status-error)' 
              }}
            >
              {metrics.buildStatus}
            </div>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {metrics.lastBuildTime}
          </div>
        </div>

        {/* Tests */}
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
            Tests
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.testsPassed}/{testTotal}
            </div>
            <div 
              className="text-sm font-semibold"
              style={{ 
                color: testPercentage >= 95 
                  ? 'var(--status-running)' 
                  : 'var(--status-error)' 
              }}
            >
              {testPercentage}%
            </div>
          </div>
        </div>

        {/* PRs Reviewed */}
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
            PRs Reviewed
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.prsReviewed}
            </div>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            today
          </div>
        </div>
      </div>
    </section>
  )
}
