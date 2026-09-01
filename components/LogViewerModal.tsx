'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface LogEntry {
  agent: string
  content: string
}

interface LogViewerModalProps {
  taskId: string
  agentName: string
  taskStatus?: string
  onClose: () => void
}

export default function LogViewerModal({
  taskId,
  agentName,
  taskStatus,
  onClose,
}: LogViewerModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveMode, setLiveMode] = useState<boolean>(false)
  const [streaming, setStreaming] = useState<boolean>(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  const isRunning =
    taskStatus === 'running' || taskStatus === 'planning' || taskStatus === 'pending'

  // ── Static snapshot fetch ────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/logs/${taskId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { logs: LogEntry[] } = await res.json()
      setLogs(data.logs)
      const match = data.logs.find((l) => l.agent === agentName)
      setActiveTab((prev) => prev || match?.agent || data.logs[0]?.agent || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [taskId, agentName])

  // ── SSE live stream ──────────────────────────────────────────────────────
  const startStream = useCallback(() => {
    // Close any existing stream
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setStreaming(true)
    setLoading(false)
    setError(null)

    const es = new EventSource(`/api/logs/${taskId}/stream`)
    esRef.current = es

    es.addEventListener('agent', (e) => {
      const { agent } = JSON.parse(e.data) as { agent: string }
      setLogs((prev) => {
        if (prev.some((l) => l.agent === agent)) return prev
        const updated = [...prev, { agent, content: '' }]
        return updated
      })
      setActiveTab((prev) => prev || agent)
    })

    es.addEventListener('log', (e) => {
      const { agent, line } = JSON.parse(e.data) as { agent: string; line: string }
      setLogs((prev) =>
        prev.map((l) =>
          l.agent === agent
            ? { ...l, content: l.content ? l.content + '\n' + line : line }
            : l
        )
      )
    })

    es.addEventListener('status', (e) => {
      const { status } = JSON.parse(e.data) as { status: string }
      if (status === 'completed' || status === 'error') {
        setStreaming(false)
        es.close()
        esRef.current = null
      }
    })

    es.onerror = () => {
      setStreaming(false)
      setError('Stream disconnected')
      es.close()
      esRef.current = null
    }
  }, [taskId])

  const stopStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setStreaming(false)
  }, [])

  // ── Auto-enable live mode when task is running ───────────────────────────
  useEffect(() => {
    if (isRunning) {
      setLiveMode(true)
    }
  }, [isRunning])

  // ── React to liveMode toggle ─────────────────────────────────────────────
  useEffect(() => {
    if (liveMode) {
      // Clear static logs and start streaming
      setLogs([])
      setActiveTab('')
      startStream()
    } else {
      stopStream()
      fetchLogs()
    }
    // Cleanup on unmount
    return () => {
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode])

  // ── Auto-scroll to bottom on new lines ──────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTab, logs])

  // ── Keyboard close ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const activeLog = logs.find((l) => l.agent === activeTab)

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      {/* Modal */}
      <div
        className="flex flex-col w-full max-w-2xl rounded-xl border overflow-hidden max-h-[90dvh]"
        style={{
          background: '#0d1117',
          borderColor: '#30363d',
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

            {/* Pulse indicator when streaming */}
            {streaming && (
              <span className="flex items-center gap-1 ml-1">
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#3fb950' }}
                  aria-hidden="true"
                />
                <span className="text-xs font-mono" style={{ color: '#3fb950' }}>
                  live
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Live toggle button */}
            <button
              onClick={() => setLiveMode((v) => !v)}
              className="min-h-[44px] px-3 flex items-center gap-1.5 text-xs rounded font-mono transition-colors"
              style={{
                background: liveMode ? '#1a2e1a' : '#161b22',
                color: liveMode ? '#3fb950' : '#8b949e',
                border: `1px solid ${liveMode ? '#3fb950' : '#30363d'}`,
              }}
              aria-pressed={liveMode}
              aria-label={liveMode ? 'Switch to static snapshot' : 'Switch to live stream'}
            >
              {liveMode ? (
                <>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: '#3fb950' }}
                    aria-hidden="true"
                  />
                  Live
                </>
              ) : (
                'Live'
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm rounded hover:opacity-80 transition-opacity font-mono"
              style={{ color: '#8b949e', background: '#161b22' }}
              aria-label="Close log viewer"
            >
              ✕ close
            </button>
          </div>
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
                className="px-3 py-2.5 text-xs font-mono rounded-t transition-colors whitespace-nowrap"
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
              {liveMode
                ? 'Waiting for log output…'
                : `No log files found for task_${taskId}`}
            </p>
          )}

          {!loading && !error && activeLog && (
            <pre
              className="text-[13px] sm:text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
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
