'use client'

import { useEffect, useState } from 'react'

interface Activity {
  id: string
  agentId: string
  agentName: string
  action: string
  type: 'task-completed' | 'error' | 'deployment' | 'pr-reviewed' | 'test-run'
  metadata?: string | null
  timestamp: string
}

const activityIcons = {
  'task-completed': '✓',
  'error': '⚠',
  'deployment': '🚀',
  'pr-reviewed': '👀',
  'test-run': '🧪',
}

const activityColors = {
  'task-completed': '#10b981',
  'error': '#ef4444',
  'deployment': '#3b82f6',
  'pr-reviewed': '#8b5cf6',
  'test-run': '#f59e0b',
}

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities?limit=30&minutes=30')
      const data = await res.json()
      setActivities(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
      setLoading(false)
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
        Loading activities...
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
        <p className="text-sm">No recent activities</p>
        <p className="text-xs mt-1">Activities from the last 30 minutes will appear here</p>
      </div>
    )
  }

  return (
    // LOW: max-h-[60vh] instead of max-h-[400px]
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <span
            className="text-lg flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
            style={{
              background: activityColors[activity.type] + '20',
              color: activityColors[activity.type],
            }}
          >
            {activityIcons[activity.type]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              <span className="font-semibold">{activity.agentName}</span>{' '}
              {activity.action}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {getTimeAgo(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
