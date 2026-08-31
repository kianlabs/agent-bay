import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeRecovery } from '@/lib/recovery-bootstrap'

// Initialize recovery on first API call
initializeRecovery().catch((err) => {
  console.error('[Metrics API] Recovery initialization failed:', err)
})

export async function GET() {
  try {
    // Calculate real metrics from database
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const CORE_WORKERS = ['Researcher', 'Backend', 'Frontend', 'Review']

    const [completedToday, inProgress, workingAgents, errorToday] = await Promise.all([
      // Tasks completed today
      prisma.task.count({
        where: {
          status: 'completed',
          completedAt: {
            gte: todayStart
          }
        }
      }),
      
      // Tasks in progress (pending, planning, or running)
      prisma.task.count({
        where: {
          status: {
            in: ['pending', 'planning', 'running']
          }
        }
      }),

      // Core workers currently working
      prisma.agent.count({
        where: {
          name: { in: CORE_WORKERS },
          status: 'working'
        }
      }),

      // Tasks with errors today
      prisma.task.count({
        where: {
          status: 'error',
          completedAt: {
            gte: todayStart
          }
        }
      }),
    ])

    // Return real metrics for dashboard
    return NextResponse.json({
      tasksCompletedToday: completedToday,
      tasksInProgress: inProgress,
      agentsWorking: workingAgents,
      totalWorkers: CORE_WORKERS.length,
      taskErrors: errorToday,
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
