'use client'

import { useState } from 'react'
import WorkloadBar from './WorkloadBar'
import ErrorCard from './ErrorCard'
import LogViewerModal from './LogViewerModal'

interface Agent {
  id: string
  name: string
  color: string
  status: string
  currentTask: string
  tasksCompleted: number
  tasksInQueue: number
  lastError?: string | null
  errorDetails?: string | null
  errorTimestamp?: Date | null
  maxCapacity?: number
  currentTaskId?: string | null
}

export default function AgentDetailList({ agents }: { agents: Agent[] }) {
  const [logModal, setLogModal] = useState<{
    taskId: string
    agentName: string
  } | null>(null)

  const handleRetry = async (agentId: string, retryTaskId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', retryTaskId }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('[handleRetry] API error:', data)
      }
    } catch (err) {
      console.error('[handleRetry] fetch error:', err)
    }
  }

  const handleViewLogs = (taskId: string, agentName: string) => {
    setLogModal({ taskId, agentName })
  }

  return (
    <>
      <section className="px-4 pb-6">
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          Agent Details
        </h3>

        {/* MEDIUM: grid-cols-1 sm:grid-cols-2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-3 rounded-lg border"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: agent.color }}
                />
                {/* MEDIUM: truncate min-w-0 on name */}
                <span
                  className="font-semibold text-sm truncate min-w-0"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {agent.name}
                </span>
                {agent.status === 'working' && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0"
                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#388bfd' }}
                  >
                    working
                  </span>
                )}
                {agent.status === 'error' && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                  >
                    error
                  </span>
                )}
              </div>

              <div
                className="text-xs mb-2 line-clamp-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {agent.currentTask}
              </div>

              <WorkloadBar
                agentId={agent.id}
                agentName={agent.name}
                currentQueue={agent.tasksInQueue}
                maxCapacity={agent.maxCapacity ?? 20}
                status={agent.status as 'idle' | 'working' | 'error'}
              />

              {agent.status === 'error' && agent.lastError && (
                <ErrorCard
                  agentId={agent.id}
                  agentName={agent.name}
                  errorMessage={agent.lastError}
                  errorDetails={agent.errorDetails ?? ''}
                  timestamp={agent.errorTimestamp ?? new Date()}
                  onRetry={() => handleRetry(agent.id, agent.currentTaskId ?? agent.id)}
                  onViewLogs={() =>
                    handleViewLogs(agent.currentTaskId ?? agent.id, agent.name)
                  }
                />
              )}

              <div
                className="text-xs font-mono mt-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {agent.tasksCompleted} tasks completed
              </div>
            </div>
          ))}
        </div>
      </section>

      {logModal && (
        <LogViewerModal
          taskId={logModal.taskId}
          agentName={logModal.agentName}
          onClose={() => setLogModal(null)}
        />
      )}
    </>
  )
}
