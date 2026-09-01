import ActivityTimeline from './ActivityTimeline'

interface Agent {
  id: string
  name: string
  color: string
  status: string
  currentTask: string
  tasksCompleted: number
  tasksInQueue: number
}

interface SpeechBubble {
  agentId: string
  message: string
  timestamp: Date
}

export default function AgentBay({
  agents,
  speechBubbles,
}: {
  agents: Agent[]
  speechBubbles: SpeechBubble[]
}) {
  const workingAgents = agents.filter((a) => a.status === 'working').length

  return (
    <section className="px-4 pb-4">
      <div
        className="p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Developer Bay
          </h2>
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-running)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--status-running)' }}
            ></span>
            Running
          </div>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {workingAgents} of {agents.length} agents active
        </p>

        <div className="mb-4">
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Recent Activity
          </h3>
          <ActivityTimeline />
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-2 gap-3">
          {agents.map((agent) => {
            const bubble = speechBubbles.find((b) => b.agentId === agent.id)
            return (
              <div key={agent.id} className="relative">
                {/* HIGH: speech bubble max-w-[60vw] whitespace-normal line-clamp-2 */}
                {bubble && (
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs font-medium shadow-lg z-10 animate-bounce max-w-[60vw] whitespace-normal line-clamp-2"
                    style={{ background: 'var(--accent)', color: '#0d1117' }}
                  >
                    {bubble.message}
                  </div>
                )}
                <div
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-full text-white text-xl font-bold flex-shrink-0"
                    style={{ background: agent.color }}
                  >
                    {agent.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* MEDIUM: truncate + line-clamp-2 */}
                    <div
                      className="font-semibold text-sm mb-0.5 truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {agent.name}
                    </div>
                    <div
                      className="text-xs line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {agent.currentTask}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
