'use client'

import { useEffect, useState } from 'react'

interface Agent {
  id: string
  name: string
  status: 'idle' | 'working' | 'error'
  currentTask: string
}

interface Task {
  id: string
  status: 'pending' | 'planning' | 'running' | 'completed' | 'error'
}

interface PipelineStats {
  activeAgents: number
  totalAgents: number
  pendingTasks: number
  runningTasks: number
  completedToday: number
  errorTasks: number
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<PipelineStats>({
    activeAgents: 0,
    totalAgents: 0,
    pendingTasks: 0,
    runningTasks: 0,
    completedToday: 0,
    errorTasks: 0
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [agentsRes, tasksRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/tasks')
      ])
      
      const agentsData = await agentsRes.json()
      const tasksData = await tasksRes.json()
      
      setAgents(agentsData)
      setTasks(tasksData)
      
      // Calculate stats
      const activeAgents = agentsData.filter((a: Agent) => a.status === 'working').length
      const pendingTasks = tasksData.filter((t: Task) => t.status === 'pending' || t.status === 'planning').length
      const runningTasks = tasksData.filter((t: Task) => t.status === 'running').length
      const completedToday = tasksData.filter((t: Task) => t.status === 'completed').length
      const errorTasks = tasksData.filter((t: Task) => t.status === 'error').length
      
      setStats({
        activeAgents,
        totalAgents: agentsData.length,
        pendingTasks,
        runningTasks,
        completedToday,
        errorTasks
      })
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'var(--status-running)'
      case 'error': return 'var(--status-error)'
      default: return 'var(--status-idle)'
    }
  }

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Agent Bay
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          AI Development Pipeline
        </p>
      </header>

      {/* Pipeline Overview Cards */}
      <section className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {/* Active Pipeline */}
          <div
            className="p-4 rounded-2xl"
            style={{ 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: 'var(--status-running)' }}
              ></div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                In Pipeline
              </span>
            </div>
            <div className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {stats.pendingTasks + stats.runningTasks}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {stats.runningTasks} running
            </div>
          </div>

          {/* Completed Today */}
          <div
            className="p-4 rounded-2xl"
            style={{ 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--status-idle)' }}
              ></div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Completed
              </span>
            </div>
            <div className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {stats.completedToday}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {stats.errorTasks} errors
            </div>
          </div>
        </div>
      </section>

      {/* Agent Status Section */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Agents
          </h2>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {stats.activeAgents}/{stats.totalAgents} active
          </span>
        </div>

        <div className="space-y-2">
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
              <div className="flex items-center gap-3">
                {/* Status Indicator */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                  style={{ background: getAgentStatusColor(agent.status) }}
                >
                  {agent.name[0]}
                </div>

                {/* Agent Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {agent.name}
                    </h3>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ 
                        background: `${getAgentStatusColor(agent.status)}20`,
                        color: getAgentStatusColor(agent.status)
                      }}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {agent.currentTask}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAB Button */}
      <button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform z-40"
        style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-lg)' }}
        onClick={() => window.location.href = '/tasks'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </main>
  )
}
