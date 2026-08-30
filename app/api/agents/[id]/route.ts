import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, currentTask, tasksCompleted, tasksInQueue } = body

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        status,
        currentTask,
        tasksCompleted,
        tasksInQueue,
      },
    })

    // Trigger Pusher event
    await pusherServer.trigger('agent-ops', 'agent-updated', {
      agentId: agent.id,
      status: agent.status,
      currentTask: agent.currentTask,
      tasksCompleted: agent.tasksCompleted,
      tasksInQueue: agent.tasksInQueue,
    })

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}
