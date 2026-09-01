'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'pending' | 'planning' | 'running' | 'completed' | 'error'

interface PlanStep {
  stepId: string
  description: string
  agent: string
  dependsOn?: string[]
  status?: string
}

interface HermesPlan {
  steps: PlanStep[]
  parallelGroups?: string[][]
}

interface AgentResult {
  agent: string
  result?: string
  error?: string
  stepId?: string
}

interface HermesEvaluation {
  summary: string
  passed?: boolean
  score?: number
  feedback?: string
}

interface Task {
  id: string
  prompt: string
  status: TaskStatus
  result?: string | null
  error?: string | null
  plan?: HermesPlan | null
  evaluation?: HermesEvaluation | null
  agentResults?: AgentResult[]
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#8b949e', bg: 'rgba(139,148,158,0.12)' },
  planning:  { label: 'Planning',  color: '#d29922', bg: 'rgba(210,153,34,0.12)'  },
  running:   { label: 'Running',   color: '#388bfd', bg: 'rgba(56,139,253,0.12)'  },
  completed: { label: 'Completed', color: '#3fb950', bg: 'rgba(63,185,80,0.12)'   },
  error:     { label: 'Error',     color: '#f85149', bg: 'rgba(248,81,73,0.12)'   },
}

const STEP_STATUS_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  completed: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)',   icon: '✓' },
  running:   { color: '#388bfd', bg: 'rgba(56,139,253,0.12)',  icon: '⟳' },
  error:     { color: '#f85149', bg: 'rgba(248,81,73,0.12)',   icon: '✗' },
  pending:   { color: '#8b949e', bg: 'rgba(139,148,158,0.08)', icon: '○' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return (
    d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )
}

function isActive(status: TaskStatus): boolean {
  return status === 'pending' || status === 'planning' || status === 'running'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className={`w-2 h-2 rounded-full ${isActive(status) ? 'animate-pulse' : ''}`}
        style={{ background: s.color }}
      />
      {s.label}
    </span>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <h2
        className="text-base font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function TimestampRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
        {formatDateTime(value)}
      </span>
    </div>
  )
}

function PlanSection({ plan }: { plan: HermesPlan }) {
  if (!plan?.steps?.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        No steps in plan.
      </p>
    )
  }
  return (
    <ol className="flex flex-col gap-3">
      {plan.steps.map((step, i) => {
        const ss = STEP_STATUS_STYLES[step.status ?? 'pending']
        return (
          <li
            key={step.stepId ?? i}
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{ background: 'var(--bg-primary)' }}
          >
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
              style={{ background: ss.bg, color: ss.color }}
            >
              {ss.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                {step.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(63,185,80,0.1)', color: '#3fb950' }}
                >
                  {step.agent}
                </span>
                {step.dependsOn && step.dependsOn.length > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,148,158,0.1)', color: '#8b949e' }}
                  >
                    depends on: {step.dependsOn.join(', ')}
                  </span>
                )}
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: 'rgba(139,148,158,0.08)', color: '#8b949e' }}
                >
                  #{step.stepId}
                </span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function AgentResultsSection({ results }: { results: AgentResult[] }) {
  if (!results?.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        No agent results yet.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {results.map((r, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(63,185,80,0.1)', color: '#3fb950' }}
            >
              {r.agent}
            </span>
            {r.stepId && (
              <span
                className="text-xs font-mono"
                style={{ color: '#8b949e' }}
              >
                step #{r.stepId}
              </span>
            )}
            {r.error && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149' }}
              >
                error
              </span>
            )}
          </div>
          {r.error ? (
            <pre
              className="text-xs whitespace-pre-wrap break-all leading-relaxed"
              style={{ color: '#f85149' }}
            >
              {r.error}
            </pre>
          ) : (
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              {r.result ?? '(no output)'}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function EvaluationSection({ evaluation }: { evaluation: HermesEvaluation }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Pass/fail + score */}
      <div className="flex items-center gap-3 flex-wrap">
        {evaluation.passed !== undefined && (
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={
              evaluation.passed
                ? { background: 'rgba(63,185,80,0.12)', color: '#3fb950' }
                : { background: 'rgba(248,81,73,0.12)', color: '#f85149' }
            }
          >
            {evaluation.passed ? '✓ Passed' : '✗ Failed'}
          </span>
        )}
        {evaluation.score !== undefined && (
          <span
            className="text-sm font-mono px-3 py-1 rounded-full"
            style={{ background: 'rgba(56,139,253,0.1)', color: '#388bfd' }}
          >
            Score: {evaluation.score}
          </span>
        )}
      </div>

      {/* Summary */}
      {evaluation.summary && (
        <div
          className="p-3 rounded-lg border"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {evaluation.summary}
          </p>
        </div>
      )}

      {/* Feedback */}
      {evaluation.feedback && (
        <div
          className="p-3 rounded-lg border"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            Feedback
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {evaluation.feedback}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${params.id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Task not found.')
        } else {
          setError(`Failed to load task (${res.status}).`)
        }
        setLoading(false)
        return
      }
      const data: Task = await res.json()
      setTask(data)
      setError(null)
    } catch (e) {
      setError('Network error — could not load task.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  // Initial fetch
  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  // Auto-refresh every 5s if task is active
  useEffect(() => {
    if (!task) return
    if (!isActive(task.status)) return

    const interval = setInterval(fetchTask, 5000)
    return () => clearInterval(interval)
  }, [task, fetchTask])

  const handleCancel = async () => {
    if (!task) return
    setCancelling(true)
    setShowCancelConfirm(false)
    try {
      const res = await fetch(`/api/tasks/${task.id}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Cancel failed (${res.status}).`)
      } else {
        await fetchTask()
      }
    } catch {
      setError('Network error — could not cancel task.')
    } finally {
      setCancelling(false)
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading task…
          </p>
        </div>
      </main>
    )
  }

  // ── Error state ──
  if (error || !task) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {error ?? 'Something went wrong.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  // ── Main render ──
  return (
    <main
      className="min-h-screen pb-12"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ── Header bar ── */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          aria-label="Back to dashboard"
        >
          ← Back
        </button>
        <h1
          className="flex-1 text-base font-semibold truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          Task Detail
        </h1>
        <StatusBadge status={task.status} />
        {isActive(task.status) && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={cancelling}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)' }}
            aria-label="Cancel task"
          >
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-5 flex flex-col gap-5 max-w-3xl mx-auto">

        {/* Prompt */}
        <SectionCard title="Prompt">
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text-primary)' }}
          >
            {task.prompt}
          </p>
          <p
            className="text-xs mt-2 font-mono"
            style={{ color: 'var(--text-secondary)' }}
          >
            ID: {task.id}
          </p>
        </SectionCard>

        {/* Timestamps */}
        <SectionCard title="Timestamps">
          <TimestampRow label="Created"   value={task.createdAt}   />
          <TimestampRow label="Started"   value={task.startedAt}   />
          <TimestampRow label="Completed" value={task.completedAt} />
        </SectionCard>

        {/* Plan */}
        {task.plan && (
          <SectionCard title={`Plan · ${task.plan.steps?.length ?? 0} step${task.plan.steps?.length === 1 ? '' : 's'}`}>
            <PlanSection plan={task.plan} />
          </SectionCard>
        )}

        {/* Agent Results */}
        {task.agentResults && task.agentResults.length > 0 && (
          <SectionCard title={`Agent Results · ${task.agentResults.length} agent${task.agentResults.length === 1 ? '' : 's'}`}>
            <AgentResultsSection results={task.agentResults} />
          </SectionCard>
        )}

        {/* Evaluation */}
        {task.evaluation && (
          <SectionCard title="Evaluation · Hermes Main">
            <EvaluationSection evaluation={task.evaluation} />
          </SectionCard>
        )}

        {/* Error */}
        {task.error && (
          <SectionCard title="Error">
            <pre
              className="text-sm whitespace-pre-wrap break-all leading-relaxed"
              style={{ color: '#f85149' }}
            >
              {task.error}
            </pre>
          </SectionCard>
        )}

        {/* Final result (raw) */}
        {task.result && !task.evaluation && (
          <SectionCard title="Result">
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {task.result}
            </p>
          </SectionCard>
        )}

        {/* Auto-refresh indicator */}
        {isActive(task.status) && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#388bfd' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Auto-refreshing every 5s
            </span>
          </div>
        )}
      </div>

      {/* ── Cancel confirmation dialog ── */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div
            className="w-full max-w-sm rounded-xl border p-6 flex flex-col gap-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h2
              id="cancel-dialog-title"
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
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Keep running
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149', border: '1px solid rgba(248,81,73,0.4)' }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
