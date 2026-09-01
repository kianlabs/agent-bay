'use client'

import { useEffect, useState } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import Header from '@/components/Header'
import MetricsGrid from '@/components/MetricsGrid'
import AgentBay from '@/components/AgentBay'
import AgentDetailList from '@/components/AgentDetailList'
import TaskHistoryPanel from '@/components/TaskHistoryPanel'
import TaskSubmitModal from '@/components/TaskSubmitModal'
import FAB from '@/components/FAB'
import BottomNav from '@/components/BottomNav'

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

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Setup Pusher
    const pusher = getPusherClient()
    const channel = pusher.subscribe('agent-ops')

    // Connection status
    pusher.connection.bind('state_change', (states: any) => {
      setConnected(states.current === 'connected')
      console.log('Pusher state:', states.current)
    })

    // Agent updated
    channel.bind('agent-updated', (data: any) => {
      console.log('Agent updated:', data)
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === data.agentId
            ? {
                ...agent,
                status: data.status,
                currentTask: data.currentTask,
                tasksCompleted: data.tasksCompleted,
                tasksInQueue: data.tasksInQueue,
              }
            : agent
        )
      )
    })

    // Metrics updated
    channel.bind('metrics-updated', (data: any) => {
      console.log('Metrics updated:', data)
      setMetrics(data)
    })

    // New message (speech bubble)
    channel.bind('new-message', (data: any) => {
      console.log('New message:', data)
      setSpeechBubbles((prev) => [
        ...prev,
        { agentId: data.agentId, message: data.message, timestamp: new Date() },
      ])

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setSpeechBubbles((prev) =>
          prev.filter(
            (bubble) =>
              !(bubble.agentId === data.agentId && bubble.message === data.message)
          )
        )
      }, 4000)
    })

    // Listen for agent errors
    channel.bind('agent-error', (data: any) => {
      console.log('Agent error received:', data)
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === data.agentId
            ? {
                ...agent,
                status: 'error',
                lastError: data.message,
                errorDetails: data.details,
                errorTimestamp: new Date(data.timestamp),
              }
            : agent
        )
      )
    })

    // Listen for new activities (for real-time timeline)
    channel.bind('activity-created', (data: any) => {
      console.log('New activity:', data)
      // Activity timeline will auto-refresh via Pusher
    })

    // Cleanup
    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [])

  async function fetchData() {
    try {
      const [agentsRes, metricsRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/metrics'),
      ])

      if (!agentsRes.ok) throw new Error(`Failed to fetch agents: ${agentsRes.status}`)
      if (!metricsRes.ok) throw new Error(`Failed to fetch metrics: ${metricsRes.status}`)

      const agentsData = await agentsRes.json()
      const metricsData = await metricsRes.json()

      setAgents(agentsData)
      setMetrics(metricsData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen pb-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))]">
      <Header connected={connected} />
      <MetricsGrid metrics={metrics} />
      <AgentBay agents={agents} speechBubbles={speechBubbles} />
      <AgentDetailList agents={agents} />
      <TaskHistoryPanel />
      <FAB onOpenModal={() => setModalOpen(true)} />
      <BottomNav />
      {modalOpen && <TaskSubmitModal onClose={() => setModalOpen(false)} />}
    </main>
  )
}
