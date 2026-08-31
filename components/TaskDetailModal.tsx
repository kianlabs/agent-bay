'use client'

interface TaskDetailModalProps {
  task: {
    id: string
    prompt: string
    status: string
    error?: string
    result?: string
    plan?: string
    evaluation?: string
    agentResults?: string
    createdAt: string
    startedAt?: string
    completedAt?: string
  } | null
  isOpen: boolean
  onClose: () => void
}

export default function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  if (!isOpen || !task) return null

  const parsePlan = () => {
    if (!task.plan) return null
    try {
      return JSON.parse(task.plan)
    } catch {
      return null
    }
  }

  const parseEvaluation = () => {
    if (!task.evaluation) return null
    try {
      return JSON.parse(task.evaluation)
    } catch {
      return null
    }
  }

  const parseAgentResults = () => {
    if (!task.agentResults) return null
    try {
      return JSON.parse(task.agentResults)
    } catch {
      return null
    }
  }

  const plan = parsePlan()
  const evaluation = parseEvaluation()
  const agentResults = parseAgentResults()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--status-idle)'
      case 'running': return 'var(--status-running)'
      case 'planning': return 'var(--status-warning)'
      case 'error': return 'var(--status-error)'
      default: return 'var(--text-secondary)'
    }
  }

  const formatDuration = () => {
    if (!task.startedAt) return null
    const start = new Date(task.startedAt)
    const end = task.completedAt ? new Date(task.completedAt) : new Date()
    const diff = end.getTime() - start.getTime()
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl rounded-2xl p-6 shadow-2xl my-8"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Task Details
              </h3>
              <span 
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ 
                  background: `${getStatusColor(task.status)}20`,
                  color: getStatusColor(task.status)
                }}
              >
                {task.status}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Created {new Date(task.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-opacity-10 transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Prompt */}
          <div>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Prompt
            </h4>
            <p 
              className="text-sm p-3 rounded-lg"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              {task.prompt}
            </p>
          </div>

          {/* Duration */}
          {formatDuration() && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Duration
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {formatDuration()}
              </p>
            </div>
          )}

          {/* Plan */}
          {plan && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Execution Plan
              </h4>
              <div 
                className="p-3 rounded-lg space-y-2"
                style={{ background: 'var(--bg-primary)' }}
              >
                {plan.summary && (
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {plan.summary}
                  </p>
                )}
                {plan.agents && (
                  <div className="flex gap-2 flex-wrap">
                    {plan.agents.map((agent: any, idx: number) => (
                      <span 
                        key={idx}
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{ 
                          background: 'var(--accent)',
                          color: 'white'
                        }}
                      >
                        {agent.agent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agent Results */}
          {agentResults && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Agent Execution
              </h4>
              <div className="space-y-2">
                {Object.entries(agentResults).map(([agentName, result]: [string, any]) => (
                  <div 
                    key={agentName}
                    className="p-3 rounded-lg"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {agentName}
                      </span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          background: result.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: result.success ? 'var(--status-idle)' : 'var(--status-error)'
                        }}
                      >
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {result.summary && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {result.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation */}
          {evaluation && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Evaluation
              </h4>
              <div 
                className="p-3 rounded-lg"
                style={{ background: 'var(--bg-primary)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ 
                      background: evaluation.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: evaluation.status === 'approved' ? 'var(--status-idle)' : 'var(--status-error)'
                    }}
                  >
                    {evaluation.status}
                  </span>
                </div>
                {evaluation.feedback && (
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {evaluation.feedback}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {task.result && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Result
              </h4>
              <p 
                className="text-sm p-3 rounded-lg whitespace-pre-wrap"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                {task.result}
              </p>
            </div>
          )}

          {/* Error */}
          {task.error && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--status-error)' }}>
                Error
              </h4>
              <p 
                className="text-sm p-3 rounded-lg"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)' }}
              >
                {task.error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
