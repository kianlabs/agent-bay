import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        status: true,
        currentTask: true,
        tasksCompleted: true,
        tasksInQueue: true,
        lastError: true,
        errorDetails: true,
        errorTimestamp: true,
        maxCapacity: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(agents)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}
