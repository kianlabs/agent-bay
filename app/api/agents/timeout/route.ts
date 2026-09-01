import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TIMEOUT_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  try {
    const workingAgents = await prisma.agent.findMany({
      where: { status: 'working' },
      select: {
        id: true,
        name: true,
        color: true,
        updatedAt: true,
        currentTaskId: true,
        currentTask: true,
      },
    })

    const now = new Date()

    const timedOut = workingAgents
      .map((agent) => {
        const elapsedMs = now.getTime() - new Date(agent.updatedAt).getTime()
        return { ...agent, elapsedMs }
      })
      .filter((agent) => agent.elapsedMs > TIMEOUT_THRESHOLD_MS)
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        color: agent.color,
        currentTaskId: agent.currentTaskId,
        currentTask: agent.currentTask,
        elapsedMs: agent.elapsedMs,
        elapsedMinutes: Math.floor(agent.elapsedMs / 60000),
      }))

    return NextResponse.json(timedOut)
  } catch (error) {
    console.error('Error fetching timed-out agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timed-out agents' },
      { status: 500 }
    )
  }
}
