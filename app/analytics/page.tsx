'use client'

import { useEffect, useState } from 'react'
import MetricsChart from '@/components/MetricsChart'

interface Metrics {
  tasksCompletedToday: number
  tasksInProgress: number
  prsReviewed: number
  buildStatus: string
  lastBuildTime: string
  testsPassed: number
  testsFailed: number
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics')
      const data = await res.json()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  const testTotal = metrics ? metrics.testsPassed + metrics.testsFailed : 0
  const testPercentage = testTotal > 0 && metrics
    ? Math.round((metrics.testsPassed / testTotal) * 100)
    : 0

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-4 border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Analytics
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Performance metrics and insights
          </p>
        </div>
      </header>

      {/* Metrics Cards */}
      <section className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Tasks Completed Today */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
              Tasks Completed
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {metrics?.tasksCompletedToday || 0}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {metrics?.tasksInProgress || 0} in progress
              </div>
            </div>
          </div>

          {/* Build Status */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
              Build Status
            </div>
            <div className="flex items-baseline gap-2">
              <div 
                className="text-2xl font-bold capitalize"
                style={{ 
                  color: metrics?.buildStatus === 'passing' 
                    ? 'var(--status-running)' 
                    : 'var(--status-error)' 
                }}
              >
                {metrics?.buildStatus || 'unknown'}
              </div>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {metrics?.lastBuildTime || 'N/A'}
            </div>
          </div>

          {/* Tests */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
              Tests
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {metrics?.testsPassed || 0}/{testTotal}
              </div>
              <div 
                className="text-sm font-semibold"
                style={{ 
                  color: testPercentage >= 95 
                    ? 'var(--status-running)' 
                    : 'var(--status-error)' 
                }}
              >
                {testPercentage}%
              </div>
            </div>
          </div>

          {/* PRs Reviewed */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
              PRs Reviewed
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {metrics?.prsReviewed || 0}
              </div>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              today
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-4">
          {/* Task Completion Trend */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              Task Completion (Last 7 Days)
            </h3>
            <MetricsChart type="completion" />
          </div>

          {/* Agent Performance */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              Agent Performance
            </h3>
            <MetricsChart type="agent-performance" />
          </div>
        </div>
      </section>

      {/* Bottom Navigation Spacer */}
      <div className="h-20"></div>
    </main>
  )
}
