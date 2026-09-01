import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Dashboard shows only 4 core workers
    // Hermes Main stays internal for orchestration
    const CORE_WORKERS = ['Researcher', 'Backend', 'Frontend', 'Review']
    
    const agents = await prisma.agent.findMany({
      where: {
        name: { in: CORE_WORKERS }
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        status: true,
        currentTask: true,
        currentTaskId: true,
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
