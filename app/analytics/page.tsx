'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface AnalyticsData {
  tasksByStatus: {
    completed: number
    error: number
    pending: number
    running: number
    planning: number
  }
  totalTasks: number
  successRate: number
  avgCompletionTimeSec: number
  tasksPerDay: { date: string; count: number }[]
  perAgentStats: {
    id: string
    name: string
    color: string
    status: string
    tasksCompleted: number
  }[]
  busiestHour: number
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#3fb950',
  error: '#f85149',
  running: '#58a6ff',
  pending: '#8b949e',
  planning: '#d29922',
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      <span className="text-xs font-medium" style={{ color: '#8b949e' }}>
        {label}
      </span>
      <span className="text-2xl font-bold" style={{ color: '#e6edf3' }}>
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: '#8b949e' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pieData = data
    ? Object.entries(data.tasksByStatus)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : []

  const agentBarData = data
    ? data.perAgentStats.filter((a) => a.tasksCompleted > 0)
    : []

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: '#0d1117', color: '#e6edf3' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: '#0d1117', borderBottom: '1px solid #21262d' }}
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          style={{ background: '#161b22', color: '#8b949e', border: '1px solid #30363d' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="flex-1 text-base font-bold" style={{ color: '#e6edf3' }}>
          📊 Performance Analytics
        </h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity"
          style={{
            background: '#3fb950',
            color: '#0d1117',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4 flex flex-col gap-6">
        {loading && !data && (
          <div className="flex flex-col gap-6 animate-pulse">
            {/* Stat cards skeleton */}
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 flex flex-col gap-2" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                  <div className="h-3 rounded bg-[#1a2035] w-2/3" />
                  <div className="h-7 rounded bg-[#1a2035] w-1/2" />
                  <div className="h-2 rounded bg-[#1a2035] w-1/3" />
                </div>
              ))}
            </div>
            {/* Chart skeletons */}
            {Array.from({ length: 3 }).map((_, i) => (
              <section key={i}>
                <div className="h-4 rounded bg-[#1a2035] w-48 mb-3" />
                <div className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                  <div className="h-44 rounded bg-[#1a2035]" />
                </div>
              </section>
            ))}
          </div>
        )}
        {error && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: '#1a0f0f', border: '1px solid #f85149', color: '#f85149' }}
          >
            {error}
          </div>
        )}

        {lastUpdated && (
          <p className="text-xs" style={{ color: '#8b949e' }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
            {data && (
              <> · Busiest hour: <span style={{ color: '#3fb950' }}>{data.busiestHour}:00–{data.busiestHour + 1}:00</span></>
            )}
          </p>
        )}

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total Tasks"
              value={data.totalTasks}
              sub="all time"
            />
            <StatCard
              label="Success Rate"
              value={`${data.successRate}%`}
              sub={`${data.tasksByStatus.completed} completed`}
            />
            <StatCard
              label="Avg Duration"
              value={formatDuration(data.avgCompletionTimeSec)}
              sub="per task"
            />
          </div>
        )}

        {/* Tasks Per Day */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#8b949e' }}>
            TASKS PER DAY — LAST 7 DAYS
          </h2>
          <div
            className="rounded-xl p-4"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            {data ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.tasksPerDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1c2128',
                      border: '1px solid #30363d',
                      borderRadius: 8,
                      color: '#e6edf3',
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'rgba(63,185,80,0.08)' }}
                  />
                  <Bar dataKey="count" fill="#3fb950" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center" style={{ color: '#8b949e' }}>
                {loading ? 'Loading…' : 'No data'}
              </div>
            )}
          </div>
        </section>

        {/* Status Distribution */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#8b949e' }}>
            TASK STATUS DISTRIBUTION
          </h2>
          <div
            className="rounded-xl p-4"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            {data && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? '#8b949e'}
                      />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: '#8b949e' }}
                    formatter={(value) => (
                      <span style={{ color: '#8b949e' }}>{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1c2128',
                      border: '1px solid #30363d',
                      borderRadius: 8,
                      color: '#e6edf3',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center" style={{ color: '#8b949e' }}>
                {loading ? 'Loading…' : 'No task data'}
              </div>
            )}
          </div>
        </section>

        {/* Per-Agent Tasks Completed */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#8b949e' }}>
            TASKS COMPLETED PER AGENT
          </h2>
          <div
            className="rounded-xl p-4"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            {data && agentBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={agentBarData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1c2128',
                      border: '1px solid #30363d',
                      borderRadius: 8,
                      color: '#e6edf3',
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'rgba(63,185,80,0.08)' }}
                  />
                  <Bar dataKey="tasksCompleted" radius={[4, 4, 0, 0]}>
                    {agentBarData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color || '#3fb950'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center" style={{ color: '#8b949e' }}>
                {loading ? 'Loading…' : 'No agent data'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
