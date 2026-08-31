'use client'

import { useEffect, useState } from 'react'
import TaskDetailModal from './TaskDetailModal'

interface Task {
  id: string
  prompt: string
  status: 'pending' | 'planning' | 'running' | 'completed' | 'error'
  error?: string
  result?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  plan?: string
  evaluation?: string
  agentResults?: string
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [retryingTask, setRetryingTask] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data.slice(0, 10)) // Show last 10 tasks
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setLoading(false)
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'var(--status-idle)'
      case 'running': return 'var(--status-running)'
      case 'planning': return 'var(--status-warning)'
      case 'error': return 'var(--status-error)'
      default: return 'var(--text-secondary)'
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      case 'running':
      case 'planning':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      case 'error':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getPlanSummary = (task: Task) => {
    if (!task.plan) return null
    try {
      const plan = JSON.parse(task.plan)
      return plan.agents?.join(', ') || null
    } catch {
      return null
    }
  }

  const handleRetry = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    setRetryingTask(task.id)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: task.prompt })
      })
      fetchTasks() // Refresh list
    } catch (error) {
      console.error('Failed to retry task:', error)
    } finally {
      setRetryingTask(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
        <p className="text-sm">No tasks yet. Create one to get started!</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {tasks.map((task) => {
          const planAgents = getPlanSummary(task)
          const isRetrying = retryingTask === task.id
          return (
            <div
              key={task.id}
              className="p-3 rounded-lg border transition-colors hover:bg-opacity-50 cursor-pointer"
              style={{ 
                background: 'var(--bg-primary)', 
                borderColor: 'var(--border)' 
              }}
              onClick={() => setSelectedTask(task)}
            >
            <div className="flex items-start gap-3">
              {/* Status Icon */}
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${getStatusColor(task.status)}20` }}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke={getStatusColor(task.status)} 
                  viewBox="0 0 24 24"
                >
                  {getStatusIcon(task.status)}
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p 
                  className="text-sm font-medium mb-1 line-clamp-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {task.prompt}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Badge */}
                  <span 
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ 
                      background: `${getStatusColor(task.status)}20`,
                      color: getStatusColor(task.status)
                    }}
                  >
                    {task.status}
                  </span>

                  {/* Agents */}
                  {planAgents && (
                    <span 
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {planAgents}
                    </span>
                  )}

                  {/* Time */}
                  <span 
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {formatTime(task.createdAt)}
                  </span>
                </div>

                {/* Error */}
                {task.error && (
                  <p 
                    className="text-xs mt-1 line-clamp-1"
                    style={{ color: 'var(--status-error)' }}
                  >
                    {task.error}
                  </p>
                )}
              </div>

              {/* Retry Button */}
              {task.status === 'error' && (
                <button
                  onClick={(e) => handleRetry(task, e)}
                  disabled={isRetrying}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </div>
          </div>
        )
      })}
      </div>

      <TaskDetailModal 
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </>
  )
}
