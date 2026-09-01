import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher-server'
import { releaseLock, isLocked } from '@/lib/execution-lock'
import { getAgentsForTask, clearAgentsForTask } from '@/lib/task-agent-tracking'

const TASK_ID_RE = /^[a-zA-Z0-9_-]+$/

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id

  // Validate taskId format
  if (!TASK_ID_RE.test(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    // Fetch task
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only cancellable if pending/planning/running
    if (task.status === 'completed' || task.status === 'error') {
      return NextResponse.json(
        { error: `Task cannot be cancelled — status is '${task.status}'` },
        { status: 409 }
      )
    }

    // ── Collect agents for this task before clearing tracking ──
    const agentIds = getAgentsForTask(taskId)

    // ── Reset all associated agents to idle ──
    const updatedAgents: { id: string; name: string }[] = []

    for (const agentId of agentIds) {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      if (!agent) continue

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: 'idle',
          currentTask: 'Waiting for task',
          currentTaskId: null,
          lastError: null,
          errorDetails: null,
          errorTimestamp: null,
        },
      })

      updatedAgents.push({ id: agentId, name: agent.name })
    }

    // ── Clear in-memory tracking for this task ──
    clearAgentsForTask(taskId)

    // ── Release execution lock if held ──
    if (isLocked(taskId)) {
      releaseLock(taskId)
    }

    // ── Mark task as error / cancelled ──
    const cancelled = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'error',
        error: 'Cancelled by user',
        completedAt: new Date(),
      },
    })

    // ── Fire Pusher events ──
    await Promise.allSettled([
      // task-updated
      pusherServer.trigger('agent-ops', 'task-updated', {
        id: cancelled.id,
        status: cancelled.status,
        error: cancelled.error,
        completedAt: cancelled.completedAt,
      }),

      // agent-updated for each affected agent
      ...updatedAgents.map((a) =>
        pusherServer.trigger('agent-ops', 'agent-updated', {
          agentId: a.id,
          status: 'idle',
          currentTask: 'Waiting for task',
          currentTaskId: null,
        })
      ),

      // metrics-updated
      pusherServer.trigger('agent-ops', 'metrics-updated', {}),
    ])

    return NextResponse.json({
      success: true,
      taskId,
      agentsReset: updatedAgents.map((a) => a.name),
    })
  } catch (error) {
    console.error('[Cancel] Error cancelling task:', error)
    return NextResponse.json({ error: 'Failed to cancel task' }, { status: 500 })
  }
}
