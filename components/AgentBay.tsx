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
  speechBubbles 
}: { 
  agents: Agent[]
  speechBubbles: SpeechBubble[]
}) {
  const workingAgents = agents.filter(a => a.status === 'working').length

  return (
    <section className="px-4 pb-4">
      <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Developer Bay
          </h2>
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-running)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--status-running)' }}></span>
            Running
          </div>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {workingAgents} of {agents.length} developers actively coding
        </p>

        {/* 3D Scene */}
        <div className="mb-4">
          <AgentScene agents={agents} speechBubbles={speechBubbles} />
        </div>

        {/* Agent Cards Grid (Fallback/Summary) */}
        <div className="grid grid-cols-2 gap-3">
          {agents.map((agent) => {
            const bubble = speechBubbles.find(b => b.agentId === agent.id)
            
            return (
              <div
                key={agent.id}
                className="relative flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                style={{ background: 'var(--bg-primary)' }}
              >
                {/* Speech Bubble */}
                {bubble && (
                  <div 
                    className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg z-10 animate-bounce"
                    style={{ 
                      background: 'var(--accent)', 
                      color: 'white' 
                    }}
                  >
                    {bubble.message}
                  </div>
                )}

                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full text-white text-xl font-bold flex-shrink-0"
                  style={{ background: agent.color }}
                >
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    {agent.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {agent.currentTask}
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

// Lazy load 3D scene
import dynamic from 'next/dynamic'
const AgentScene = dynamic(() => import('./AgentScene'), { ssr: false })
