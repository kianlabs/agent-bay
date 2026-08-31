'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'

interface Agent {
  id: string
  name: string
  color: string
  status: 'idle' | 'working' | 'error'
  currentTask: string
  tasksCompleted: number
  tasksInQueue: number
  lastError?: string
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [liveCount, setLiveCount] = useState(0)

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 5000)
    
    // Pusher setup
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1'
    })
    
    const channel = pusher.subscribe('agent-bay')
    
    channel.bind('agent-updated', (data: any) => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === data.agentId
            ? { ...agent, ...data }
            : agent
        )
      )
    })
    
    return () => {
      clearInterval(interval)
      pusher.unsubscribe('agent-bay')
    }
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data)
      setLiveCount(data.filter((a: Agent) => a.status === 'working').length)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const getAgentColor = (name: string) => {
    const colors: Record<string, string> = {
      'Researcher': 'var(--agent-researcher)',
      'Backend': 'var(--agent-backend)',
      'Frontend': 'var(--agent-frontend)',
      'Review': 'var(--agent-review)',
      'Hermes Main': 'var(--agent-main)'
    }
    return colors[name] || 'var(--accent)'
  }

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--accent)' }}
            >
              AO
            </div>
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: '#6c5ce7' }}
            >
              KN
            </div>
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--status-running-bg)' }}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--status-running)' }}
            ></div>
            <span className="text-sm font-semibold" style={{ color: 'var(--status-running)' }}>
              Live
            </span>
          </div>
        </div>
        
        <button className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {liveCount > 0 && (
            <div 
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--status-error)' }}
            >
              {liveCount}
            </div>
          )}
        </button>
      </header>

      {/* Agent Grid - Top Section */}
      <section className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {agents.slice(0, 4).map((agent) => (
            <div
              key={agent.id}
              className="p-4 rounded-xl"
              style={{ 
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: getAgentColor(agent.name) }}
                >
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    {agent.name}
                  </h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {agent.currentTask}...
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Developer Team Section */}
      <section className="px-4">
        <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          DEVELOPER TEAM
        </h2>
        
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="relative p-4 rounded-xl"
              style={{ 
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {agent.status === 'error' && (
                <div 
                  className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--status-error)', color: 'white' }}
                >
                  Error
                </div>
              )}
              
              <div className="flex items-start gap-3 mb-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ background: getAgentColor(agent.name) }}
                ></div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {agent.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {agent.currentTask}
                  </p>
                </div>
              </div>
              
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {agent.tasksInQueue} in queue · {agent.tasksCompleted} done
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAB */}
      <button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform z-40"
        style={{ background: 'var(--accent)' }}
        onClick={() => window.location.href = '/tasks'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </main>
  )
}
