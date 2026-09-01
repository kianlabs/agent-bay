import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields before returning
    return NextResponse.json({
      ...task,
      plan: task.plan ? JSON.parse(task.plan) : null,
      evaluation: task.evaluation ? JSON.parse(task.evaluation) : null,
      agentResults: task.agentResults ? JSON.parse(task.agentResults) : [],
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}
