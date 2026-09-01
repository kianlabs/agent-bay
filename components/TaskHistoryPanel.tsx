'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher-client'

interface Task {
  id: string
  prompt: string
  status: 'pending' | 'planning' | 'running' | 'completed' | 'error'
  createdAt: string
  completedAt: string | null
}

const STATUS_STYLES: Record<Task['status'], { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#8b949e', bg: 'rgba(139,148,158,0.12)' },
  planning:  { label: 'Planning',  color: '#d29922', bg: 'rgba(210,153,34,0.12)'  },
  running:   { label: 'Running',   color: '#388bfd', bg: 'rgba(56,139,253,0.12)'  },
  completed: { label: 'Completed', color: '#3fb950', bg: 'rgba(63,185,80,0.12)'   },
  error:     { label: 'Error',     color: '#f85149', bg: 'rgba(248,81,73,0.12)'   },
}

function StatusBadge({ status }: { status: Task['status'] }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function TaskHistoryPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) return
      const data = await res.json()
      setTasks(data.slice(0, 10))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe('agent-ops')
    channel.bind('task-created', fetchTasks)
    channel.bind('task-updated', fetchTasks)
    return () => {
      channel.unbind('task-created', fetchTasks)
      channel.unbind('task-updated', fetchTasks)
    }
  }, [fetchTasks])

  return (
    <section className="px-4 pb-4">
      <div
        className="p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Task History
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            last 10
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>
            No tasks yet. Submit one with button below.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg"
                style={{ background: 'var(--bg-primary)' }}
              >
                <div className="flex-1 min-w-0">
                  {/* MEDIUM: line-clamp-2 on prompt */}
                  <p
                    className="text-sm font-medium line-clamp-2 mb-1"
                    style={{ color: 'var(--text-primary)' }}
                    title={task.prompt}
                  >
                    {task.prompt}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatTime(task.createdAt)}
                  </p>
                </div>
                <StatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
