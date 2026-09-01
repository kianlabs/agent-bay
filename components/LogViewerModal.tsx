'use client'

import { useEffect, useRef, useState } from 'react'

interface LogEntry {
  agent: string
  content: string
}

interface LogViewerModalProps {
  taskId: string
  agentName: string
  onClose: () => void
}

export default function LogViewerModal({
  taskId,
  agentName,
  onClose,
}: LogViewerModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/logs/${taskId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: { logs: LogEntry[] } = await res.json()
        setLogs(data.logs)
        // Default to the tab matching agentName, or first available
        const match = data.logs.find((l) => l.agent === agentName)
        setActiveTab(match?.agent ?? data.logs[0]?.agent ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs')
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [taskId, agentName])

  // Auto-scroll to bottom when active tab or content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTab, logs])

  const activeLog = logs.find((l) => l.agent === activeTab)

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="flex flex-col w-full max-w-2xl rounded-xl border overflow-hidden"
        style={{
          background: '#0d1117',
          borderColor: '#30363d',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: '#30363d' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono" style={{ color: '#3fb950' }}>
              ▸ logs
            </span>
            <span className="text-sm font-mono" style={{ color: '#8b949e' }}>
              / task_{taskId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded hover:opacity-80 transition-opacity font-mono"
            style={{ color: '#8b949e', background: '#161b22' }}
            aria-label="Close log viewer"
          >
            ✕ close
          </button>
        </div>

        {/* Tabs */}
        {!loading && !error && logs.length > 0 && (
          <div
            className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0 overflow-x-auto"
            style={{ borderBottom: '1px solid #30363d' }}
          >
            {logs.map((log) => (
              <button
                key={log.agent}
                onClick={() => setActiveTab(log.agent)}
                className="px-3 py-1.5 text-xs font-mono rounded-t transition-colors whitespace-nowrap"
                style={{
                  background: activeTab === log.agent ? '#161b22' : 'transparent',
                  color: activeTab === log.agent ? '#3fb950' : '#8b949e',
                  borderBottom:
                    activeTab === log.agent
                      ? '2px solid #3fb950'
                      : '2px solid transparent',
                }}
              >
                {log.agent}.log
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#3fb950', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {error && (
            <p className="text-sm font-mono" style={{ color: '#f85149' }}>
              Error: {error}
            </p>
          )}

          {!loading && !error && logs.length === 0 && (
            <p className="text-sm font-mono" style={{ color: '#8b949e' }}>
              No log files found for task_{taskId}
            </p>
          )}

          {!loading && !error && activeLog && (
            <pre
              className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
              style={{ color: '#e6edf3' }}
            >
              {activeLog.content || '(empty log)'}
            </pre>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
