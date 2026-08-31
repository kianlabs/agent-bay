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
    <main style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="px-4 py-6 mb-4" style={{ background: 'white' }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>
          Analytics
        </h1>
        <p className="text-sm" style={{ color: '#666' }}>
          Performance metrics and insights
        </p>
      </header>

      {/* Metrics Cards */}
      <section className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Tasks Completed Today */}
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: '#999' }}>
              Completed
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                {metrics?.tasksCompletedToday || 0}
              </div>
              <div className="text-sm" style={{ color: '#4CAF50' }}>
                today
              </div>
            </div>
            <div className="text-xs mt-1" style={{ color: '#999' }}>
              {metrics?.tasksInProgress || 0} in progress
            </div>
          </div>

          {/* Build Status */}
          <div
            className="p-4 rounded-2xl shadow-sm"
            style={{ background: 'white' }}
          >
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: '#999' }}>
              Build
            </div>
            <div 
              className="text-2xl font-bold capitalize mb-1"
              style={{ 
                color: metrics?.buildStatus === 'passing' ? '#4CAF50' : '#F44336'
              }}
            >
              {metrics?.buildStatus || '—'}
            </div>
            <div className="text-xs" style={{ color: '#999' }}>
              {metrics?.lastBuildTime || 'N/A'}
            </div>
          </div>

          {/* Tests */}
          <div
            className="p-4 rounded-2xl shadow-sm"
            style={{ background: 'white' }}
          >
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: '#999' }}>
              Tests
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                {testPercentage}%
              </div>
            </div>
            <div className="text-xs mt-1" style={{ color: '#999' }}>
              {metrics?.testsPassed || 0}/{testTotal} passing
            </div>
          </div>

          {/* PRs Reviewed */}
          <div
            className="p-4 rounded-2xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
              PRs
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" style={{ color: 'white' }}>
                {metrics?.prsReviewed || 0}
              </div>
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              reviewed today
            </div>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="px-4 space-y-4">
        {/* Task Completion Trend */}
        <div
          className="p-4 rounded-2xl shadow-sm"
          style={{ background: 'white' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1A1A1A' }}>
            Completion Trend (7 Days)
          </h3>
          <MetricsChart type="completion" />
        </div>

        {/* Agent Performance */}
        <div
          className="p-4 rounded-2xl shadow-sm"
          style={{ background: 'white' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1A1A1A' }}>
            Agent Performance
          </h3>
          <MetricsChart type="agent-performance" />
        </div>
      </section>
    </main>
  )
}
