import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher-server'
import { tryAcquireLock, releaseLock, isLocked } from '@/lib/execution-lock'
import { runOrchestrationLocked } from '@/lib/hermes-orchestrator'
import { clearAgentsForTask } from '@/lib/task-agent-tracking'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, currentTask, tasksCompleted, tasksInQueue } = body

    const VALID_STATUSES = ['idle', 'working', 'error']
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

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

    // 1. Validate action and retryTaskId
    if (action !== 'retry' || !retryTaskId) {
      return NextResponse.json(
        { error: 'action "retry" and retryTaskId are required' },
        { status: 400 }
      )
    }

    // 2. Fetch agent and validate it is associated with retryTaskId
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    if (agent.currentTaskId !== retryTaskId) {
      return NextResponse.json(
        { error: 'Agent is not associated with the specified task' },
        { status: 409 }
      )
    }

    // 3. Fetch task and validate status === 'error'
    const task = await prisma.task.findUnique({
      where: { id: retryTaskId },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    if (task.status !== 'error') {
      return NextResponse.json(
        { error: `Task is not in error state (current: ${task.status})` },
        { status: 409 }
      )
    }

    // 4. Check task is not locked/running/planning/pending — reject without DB mutation
    if (isLocked(retryTaskId)) {
      return NextResponse.json(
        { error: 'Task is currently locked/running, cannot retry' },
        { status: 409 }
      )
    }

    // Double-check: task.status must be 'error' (not active), already validated above.
    // Also guard against running/planning/pending states reaching here (belt-and-suspenders).
    const activeStatuses = ['running', 'planning', 'pending']
    if (activeStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: `Task is active (status: ${task.status}), cannot retry` },
        { status: 409 }
      )
    }

    // 5. Acquire execution lock BEFORE any DB mutation
    if (!tryAcquireLock(retryTaskId)) {
      return NextResponse.json(
        { error: 'Could not acquire execution lock — task may already be running' },
        { status: 409 }
      )
    }

    try {
      // 6. Now we own the lock — safe to reset task status to 'pending', clear error fields
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

      // Reset agent to idle
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

      // Fire metrics-updated
      await pusherServer.trigger('agent-ops', 'metrics-updated', {})

      // 7. Run orchestration with lock already acquired — use runOrchestrationLocked
      // to avoid double-locking. Run fire-and-forget; lock released in finally.
      runOrchestrationLocked(retryTaskId, task.prompt)
        .catch((err) => {
          console.error(`[API Agents] Retry orchestration failed for task ${retryTaskId}:`, err)
        })
        .finally(() => {
          clearAgentsForTask(retryTaskId)
          releaseLock(retryTaskId)
        })

      return NextResponse.json({
        message: 'Task re-queued for retry',
        taskId: retryTaskId,
      })
    } catch (innerError) {
      // 8. If anything fails before/during orchestration start, release lock
      clearAgentsForTask(retryTaskId)
      releaseLock(retryTaskId)
      throw innerError
    }
  } catch (error) {
    console.error('Error retrying task:', error)
    return NextResponse.json(
      { error: 'Failed to retry task' },
      { status: 500 }
    )
  }
}
