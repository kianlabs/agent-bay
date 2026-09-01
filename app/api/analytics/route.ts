import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Fetch all tasks needed for analytics
    const [allTasks, agents] = await Promise.all([
      prisma.task.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          tasksCompleted: true,
        },
        orderBy: { name: 'asc' },
      }),
    ])

    // --- Task counts by status ---
    const statusCounts = allTasks.reduce(
      (acc, t) => {
        const s = t.status as string
        acc[s] = (acc[s] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const completed = statusCounts['completed'] || 0
    const error = statusCounts['error'] || 0
    const pending = statusCounts['pending'] || 0
    const running = statusCounts['running'] || 0
    const planning = statusCounts['planning'] || 0

    // --- Success rate ---
    const successRate =
      completed + error > 0
        ? Math.round((completed / (completed + error)) * 100 * 10) / 10
        : 0

    // --- Avg completion time (ms -> seconds) ---
    const completedTasks = allTasks.filter(
      (t) => t.status === 'completed' && t.startedAt && t.completedAt
    )
    const avgCompletionTimeMs =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            return sum + (t.completedAt!.getTime() - t.startedAt!.getTime())
          }, 0) / completedTasks.length
        : 0
    const avgCompletionTimeSec = Math.round(avgCompletionTimeMs / 1000)

    // --- Tasks per day (last 7 days) ---
    const tasksPerDay: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      const count = allTasks.filter(
        (t) => t.createdAt >= day && t.createdAt <= dayEnd
      ).length

      const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      tasksPerDay.push({ date: label, count })
    }

    // --- Busiest hour ---
    const hourCounts = new Array(24).fill(0)
    for (const t of allTasks) {
      const h = t.createdAt.getHours()
      hourCounts[h]++
    }
    const busiestHour = hourCounts.indexOf(Math.max(...hourCounts))

    return NextResponse.json({
      tasksByStatus: {
        completed,
        error,
        pending,
        running,
        planning,
      },
      totalTasks: allTasks.length,
      successRate,
      avgCompletionTimeSec,
      tasksPerDay,
      perAgentStats: agents.map((a) => ({
        id: a.id,
        name: a.name,
        color: a.color,
        status: a.status,
        tasksCompleted: a.tasksCompleted,
      })),
      busiestHour,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
