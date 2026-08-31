'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TaskDetailModal from '@/components/TaskDetailModal'

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

function TasksContent() {
  const searchParams = useSearchParams()
  const filter = searchParams?.get('filter')
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [retryingTask, setRetryingTask] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setLoading(false)
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
      fetchTasks()
    } catch (error) {
      console.error('Failed to retry task:', error)
    } finally {
      setRetryingTask(null)
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return '#4CAF50'
      case 'running': return '#2196F3'
      case 'planning': return '#FF9800'
      case 'error': return '#F44336'
      default: return '#999'
    }
  }

  const getStatusBg = (status: Task['status']) => {
    switch (status) {
      case 'completed': return '#E8F5E9'
      case 'running': return '#E3F2FD'
      case 'planning': return '#FFF3E0'
      case 'error': return '#FFEBEE'
      default: return '#F5F5F5'
    }
  }

  const filteredTasks = filter
    ? tasks.filter(t => {
        if (filter === 'pipeline') return ['pending', 'planning', 'running'].includes(t.status)
        if (filter === 'completed') return t.status === 'completed'
        if (filter === 'error') return t.status === 'error'
        return true
      })
    : tasks

  if (loading) {
    return (
      <main style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: '80px' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#667eea' }}></div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="px-4 py-6 mb-4" style={{ background: 'white' }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>
          {filter === 'pipeline' ? 'Pipeline' : filter === 'completed' ? 'Completed' : filter === 'error' ? 'Errors' : 'All Tasks'}
        </h1>
        <p className="text-sm" style={{ color: '#666' }}>
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </p>
      </header>

      {/* Task List */}
      <section className="px-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#999' }}>No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const isRetrying = retryingTask === task.id
              return (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl shadow-sm transition-all hover:shadow-md cursor-pointer"
                  style={{ background: 'white' }}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Indicator */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: getStatusBg(task.status) }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ background: getStatusColor(task.status) }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm font-medium mb-2 line-clamp-2"
                        style={{ color: '#1A1A1A' }}
                      >
                        {task.prompt}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span 
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ 
                            background: getStatusBg(task.status),
                            color: getStatusColor(task.status)
                          }}
                        >
                          {task.status}
                        </span>

                        {/* Time */}
                        <span className="text-xs" style={{ color: '#999' }}>
                          {new Date(task.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Error */}
                      {task.error && (
                        <p className="text-xs mt-2 line-clamp-1" style={{ color: '#F44336' }}>
                          {task.error}
                        </p>
                      )}
                    </div>

                    {/* Retry Button */}
                    {task.status === 'error' && (
                      <button
                        onClick={(e) => handleRetry(task, e)}
                        disabled={isRetrying}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50"
                        style={{ background: '#667eea', color: 'white' }}
                      >
                        {isRetrying ? '...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <TaskDetailModal 
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </main>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <main style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: '80px' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#667eea' }}></div>
        </div>
      </main>
    }>
      <TasksContent />
    </Suspense>
  )
}
