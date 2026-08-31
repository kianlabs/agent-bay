import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Calculate real metrics from database
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [completedToday, inProgress] = await Promise.all([
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
    ])

    // Return real metrics with honest values
    return NextResponse.json({
      tasksCompletedToday: completedToday,
      tasksInProgress: inProgress,
      prsReviewed: 0, // Not tracked yet - waiting for real PR data source
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
