import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Calculate real metrics from database
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [completedToday, inProgress, allAgents] = await Promise.all([
      // Tasks completed today
      prisma.task.count({
        where: {
          status: 'completed',
          completedAt: {
            gte: todayStart
          }
        }
      }),
      
      // Tasks in progress
      prisma.task.count({
        where: {
          status: {
            in: ['pending', 'planning', 'running']
          }
        }
      }),
      
      // Agent stats
      prisma.agent.findMany({
        select: {
          tasksCompleted: true
        }
      })
    ])

    const totalAgentTasks = allAgents.reduce((sum, agent) => sum + agent.tasksCompleted, 0)

    return NextResponse.json({
      tasksCompletedToday: completedToday,
      tasksInProgress: inProgress,
      prsReviewed: totalAgentTasks,
      buildStatus: 'passing',
      lastBuildTime: 'just now',
      testsPassed: 0,
      testsFailed: 0,
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
