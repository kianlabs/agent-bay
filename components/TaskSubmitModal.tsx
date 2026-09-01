'use client'

import { useState } from 'react'

interface TaskSubmitModalProps {
  onClose: () => void
}

export default function TaskSubmitModal({ onClose }: TaskSubmitModalProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      {/* Sheet */}
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Submit Task
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-primary)] disabled:opacity-40"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(63,185,80,0.15)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="#3fb950" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: '#3fb950' }}>
              Task submitted!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the task for your agent…"
              rows={5}
              disabled={loading}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors disabled:opacity-50"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3fb950')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149' }}>
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#3fb950', color: '#0d1117' }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#0d1117] border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Task'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
