'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  color: string
  status: string
  currentTask: string
  tasksCompleted: number
  tasksInQueue: number
  lastError?: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'var(--status-running)'
      case 'error': return 'var(--status-error)'
      default: return 'var(--status-idle)'
    }
  }

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-4 border-b" 
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Agents
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Monitor all AI agents
        </p>
      </header>

      {/* Agent List */}
      <section className="p-4 space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="p-4 rounded-2xl"
            style={{ 
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: agent.color }}
              >
                {agent.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {agent.name}
                  </h3>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ 
                      background: `${getStatusColor(agent.status)}20`,
                      color: getStatusColor(agent.status)
                    }}
                  >
                    {agent.status}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {agent.currentTask}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {agent.tasksCompleted}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>In Queue</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {agent.tasksInQueue}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</div>
                <div className="text-lg font-bold" style={{ color: getStatusColor(agent.status) }}>
                  {agent.status === 'working' ? '●' : agent.status === 'error' ? '✕' : '○'}
                </div>
              </div>
            </div>

            {agent.lastError && (
              <div 
                className="mt-3 p-2 rounded-lg text-xs"
                style={{ background: 'var(--status-error-bg)', color: 'var(--status-error)' }}
              >
                {agent.lastError}
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  )
}
