'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MetricsChartProps {
  type: 'completion' | 'agent-performance'
}

export default function MetricsChart({ type }: MetricsChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [type])

  const fetchData = async () => {
    try {
      if (type === 'completion') {
        // Fetch task completion data
        const res = await fetch('/api/tasks')
        const tasks = await res.json()
        
        // Group by date
        const grouped = tasks.reduce((acc: any, task: any) => {
          if (task.completedAt) {
            const date = new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            acc[date] = (acc[date] || 0) + 1
          }
          return acc
        }, {})

        const chartData = Object.entries(grouped).map(([date, count]) => ({
          date,
          completed: count
        }))

        setData(chartData.slice(-7)) // Last 7 days
      } else if (type === 'agent-performance') {
        // Fetch agent stats
        const res = await fetch('/api/agents')
        const agents = await res.json()
        
        const chartData = agents.map((agent: any) => ({
          name: agent.name,
          completed: agent.tasksCompleted,
          queued: agent.tasksInQueue
        }))

        setData(chartData)
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-secondary)' }}>
        <p className="text-sm">No data available</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div 
        className="px-3 py-2 rounded-lg shadow-lg border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }

  if (type === 'completion') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="completed" 
            stroke="var(--accent)" 
            strokeWidth={2}
            dot={{ fill: 'var(--accent)', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis 
          dataKey="name" 
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          stroke="var(--border)"
        />
        <YAxis 
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          stroke="var(--border)"
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="completed" fill="var(--accent)" />
        <Bar dataKey="queued" fill="var(--status-warning)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
