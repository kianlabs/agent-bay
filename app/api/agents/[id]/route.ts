import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher-server'
import { orchestrateTask } from '@/lib/hermes-orchestrator'

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

    // Fire metrics-updated after status change
    await pusherServer.trigger('agent-ops', 'metrics-updated', {})

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, retryTaskId } = body

    if (action !== 'retry' || !retryTaskId) {
      return NextResponse.json(
        { error: 'action "retry" and retryTaskId are required' },
        { status: 400 }
      )
    }

    // Fetch the task to retry
    const task = await prisma.task.findUnique({
      where: { id: retryTaskId },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Reset task status to pending so it can be re-queued
    await prisma.task.update({
      where: { id: retryTaskId },
      data: {
        status: 'pending',
        error: null,
        result: null,
        evaluation: null,
        agentResults: null,
        startedAt: null,
        completedAt: null,
      },
    })

    // Reset agent to idle if it was in error state
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
    })

    if (agent && agent.status === 'error') {
      await prisma.agent.update({
        where: { id: params.id },
        data: {
          status: 'idle',
          currentTask: 'Waiting for task',
          lastError: null,
          errorDetails: null,
          errorTimestamp: null,
        },
      })

      await pusherServer.trigger('agent-ops', 'agent-updated', {
        agentId: params.id,
        status: 'idle',
        currentTask: 'Waiting for task',
      })
    }

    // Re-queue the task via orchestrator (don't await — runs in background)
    orchestrateTask(retryTaskId, task.prompt).catch((err) => {
      console.error(`[API Agents] Retry orchestration failed for task ${retryTaskId}:`, err)
    })

    // Fire metrics-updated after re-queue
    await pusherServer.trigger('agent-ops', 'metrics-updated', {})

    return NextResponse.json({
      message: 'Task re-queued for retry',
      taskId: retryTaskId,
    })
  } catch (error) {
    console.error('Error retrying task:', error)
    return NextResponse.json(
      { error: 'Failed to retry task' },
      { status: 500 }
    )
  }
}
