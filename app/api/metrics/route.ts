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
      
      // Tasks in progress (pending, planning, or running)
      prisma.task.count({
        where: {
          status: {
            in: ['pending', 'planning', 'running']
          }
        }
      }),
      
      // Sum of all agent tasks completed
      prisma.agent.findMany({
        select: {
          tasksCompleted: true
        }
      })
    ])

    const totalAgentTasks = allAgents.reduce((sum, agent) => sum + agent.tasksCompleted, 0)

    // Return real metrics with honest values
    return NextResponse.json({
      tasksCompletedToday: completedToday,
      tasksInProgress: inProgress,
      prsReviewed: totalAgentTasks, // Total work done by all agents
      buildStatus: 'unknown', // We don't track CI/CD yet
      lastBuildTime: 'unknown', // We don't track build times yet
      testsPassed: 0, // We don't run tests yet
      testsFailed: 0, // We don't run tests yet
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
