interface Metrics {
  tasksCompletedToday: number
  tasksInProgress: number
  agentsWorking: number
  totalWorkers: number
  taskErrors: number
}

export default function MetricsGrid({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null

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
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            today
          </div>
        </div>

        {/* Tasks In Progress */}
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
            Tasks In Progress
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.tasksInProgress}
            </div>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            active
          </div>
        </div>

        {/* Agents Working */}
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
            Agents Working
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.agentsWorking}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              / {metrics.totalWorkers}
            </div>
          </div>
        </div>

        {/* Task Errors */}
        <div
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
            Task Errors
          </div>
          <div className="flex items-baseline gap-2">
            <div 
              className="text-3xl font-bold"
              style={{ 
                color: metrics.taskErrors > 0 
                  ? 'var(--status-error)' 
                  : 'var(--text-primary)' 
              }}
            >
              {metrics.taskErrors}
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
