'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher-client'

type CancellableStatus = 'pending' | 'planning' | 'running'

function isCancellable(status: Task['status']): status is CancellableStatus {
  return status === 'pending' || status === 'planning' || status === 'running'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  prompt: string
  status: 'pending' | 'planning' | 'running' | 'completed' | 'error'
  createdAt: string
  completedAt: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Task['status'], { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#8b949e', bg: 'rgba(139,148,158,0.12)' },
  planning:  { label: 'Planning',  color: '#d29922', bg: 'rgba(210,153,34,0.12)'  },
  running:   { label: 'Running',   color: '#388bfd', bg: 'rgba(56,139,253,0.12)'  },
  completed: { label: 'Completed', color: '#3fb950', bg: 'rgba(63,185,80,0.12)'   },
  error:     { label: 'Error',     color: '#f85149', bg: 'rgba(248,81,73,0.12)'   },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
    ' · ' +
    d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Task['status'] }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TaskHistoryPanel() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) return
      const data = await res.json()
      setTasks(data.slice(0, 10))
    } catch {
      // silently ignore network errors — stale data is fine here
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCancel = useCallback(async (taskId: string) => {
    setConfirmId(null)
    setCancellingId(taskId)
    try {
      await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' })
      // Refresh list after cancel
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.slice(0, 10))
      }
    } catch {
      // silently ignore
    } finally {
      setCancellingId(null)
    }
  }, [])

  useEffect(() => {
    fetchTasks()

    // Initial poll every 5s as fallback
    const poll = setInterval(fetchTasks, 5000)

    // Real-time updates via Pusher
    const pusher = getPusherClient()
    const channel = pusher.subscribe('agent-ops')

    const onTaskCreated = (data: any) => {
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === data.id)
        if (exists) return prev
        return [data, ...prev].slice(0, 10)
      })
    }

    const onTaskUpdated = (data: any) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === data.id ? { ...t, ...data } : t
        )
      )
    }

    channel.bind('task-created', onTaskCreated)
    channel.bind('task-updated', onTaskUpdated)

    return () => {
      clearInterval(poll)
      channel.unbind('task-created', onTaskCreated)
      channel.unbind('task-updated', onTaskUpdated)
      channel.unsubscribe()
    }
  }, [fetchTasks])

  return (
    <section className="px-4 pb-4">
      <div
        className="p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Task History
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
          >
            last 10
          </span>
        </div>

        {/* Loading spinner */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : tasks.length === 0 ? (
          <p
            className="text-sm text-center py-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            No tasks yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {tasks.map((task) => (
              <li
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/tasks/${task.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/tasks/${task.id}`)
                  }
                }}
                className="flex items-start justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ background: 'var(--bg-primary)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background =
                    'rgba(63,185,80,0.06)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background =
                    'var(--bg-primary)'
                }}
                aria-label={`View details for task: ${task.prompt}`}
              >
                <div className="flex-1 min-w-0">
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={task.status} />
                  {isCancellable(task.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmId(task.id)
                      }}
                      disabled={cancellingId === task.id}
                      className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)' }}
                      aria-label={`Cancel task: ${task.prompt}`}
                      title="Cancel task"
                    >
                      {cancellingId === task.id ? '…' : '×'}
                    </button>
                  )}
                  <span style={{ color: 'var(--text-secondary)' }} className="text-xs">›</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Cancel confirmation dialog ── */}
      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-confirm-title"
        >
          <div
            className="w-full max-w-sm rounded-xl border p-6 flex flex-col gap-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h2
              id="cancel-confirm-title"
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Cancel this task?
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This will stop all running agents and mark the task as cancelled. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Keep running
              </button>
              <button
                onClick={() => handleCancel(confirmId)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149', border: '1px solid rgba(248,81,73,0.4)' }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
