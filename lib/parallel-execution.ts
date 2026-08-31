/**
 * Parallel Execution Helper
 *
 * Executes worker steps in parallel with dependency awareness.
 * Uses the global worker execution coordinator for concurrency and agent serialization.
 */

import { prisma } from './prisma'
import { pusherServer } from './pusher-server'
import { executeHermesAgent } from './hermes-executor'
import { trackAgentForTask } from './task-agent-tracking'
import { workerCoordinator } from './worker-execution-coordinator'
import type { ExecutionStep } from './dependency-graph'
import type { ParallelScheduler } from './parallel-scheduler'

// Agent name mapping
const AGENT_NAME_MAP: Record<string, string> = {
  research: 'Researcher',
  backend: 'Backend',
  frontend: 'Frontend',
  review: 'Review',
}

/**
 * Execute a single step (worker)
 *
 * Acquires global worker slot via coordinator before starting.
 * Releases in finally block to prevent resource leaks.
 */
async function executeStep(
  taskId: string,
  step: ExecutionStep,
  scheduler: ParallelScheduler
): Promise<void> {
  const agentName = AGENT_NAME_MAP[step.agent]
  if (!agentName) {
    console.error(`[ParallelExec] Unknown agent: ${step.agent}`)
    scheduler.skipStep(step.id, `Unknown agent: ${step.agent}`)
    return
  }

  console.log(`[ParallelExec] Starting ${step.id} (${agentName}): ${step.task.substring(0, 50)}...`)

  // Find agent in DB
  const agent = await prisma.agent.findFirst({
    where: { name: agentName },
  })

  if (!agent) {
    console.error(`[ParallelExec] Agent ${agentName} not found in DB`)
    scheduler.failStep(step.id, `Agent ${agentName} not found in DB`, 0)
    return
  }

  // Acquire global worker slot (may block if at capacity or agent busy)
  await workerCoordinator.acquire(step.agent)

  const startTime = Date.now()

  try {
    // Track agent for this task (for scoped cleanup on fatal errors)
    trackAgentForTask(taskId, agent.id)

    // Mark as running in scheduler
    scheduler.startStep(step.id)

    // Update agent to working
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'working',
        currentTask: step.task,
        lastError: null,
        errorDetails: null,
        errorTimestamp: null,
      },
    })

    await pusherServer.trigger('agent-ops', 'agent-updated', {
      agentId: agent.id,
      status: 'working',
      currentTask: step.task,
    })

    await prisma.activity.create({
      data: {
        agentId: agent.id,
        agentName,
        action: `started: ${step.task}`,
        type: 'task-completed',
      },
    })

    // Execute agent
    const result = await executeHermesAgent(agentName, step.task, taskId)
    const durationMs = Date.now() - startTime

    if (result.success) {
      // Success
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'idle',
          currentTask: 'Waiting for task',
          tasksCompleted: { increment: 1 },
        },
      })

      await pusherServer.trigger('agent-ops', 'agent-updated', {
        agentId: agent.id,
        status: 'idle',
        currentTask: 'Waiting for task',
      })

      await prisma.activity.create({
        data: {
          agentId: agent.id,
          agentName,
          action: `completed successfully (${Math.round(durationMs / 1000)}s)`,
          type: 'task-completed',
        },
      })

      const preview = result.stdout.length > 100 ? result.stdout.substring(0, 97) + '...' : result.stdout

      await prisma.event.create({
        data: {
          agentId: agent.id,
          message: `✓ ${preview}`,
        },
      })

      await pusherServer.trigger('agent-ops', 'new-message', {
        agentId: agent.id,
        message: `✓ ${preview}`,
        timestamp: new Date(),
      })

      scheduler.completeStep(step.id, result.stdout, durationMs)
      console.log(`[ParallelExec] ${step.id} completed in ${durationMs}ms`)
    } else {
      // Error
      const errorMsg = result.timedOut
        ? `Timed out after ${Math.round(durationMs / 1000)}s`
        : result.stderr || 'Unknown error'

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'error',
          currentTask: `Failed: ${step.task.substring(0, 100)}`,
          lastError: errorMsg.substring(0, 200),
          errorDetails: result.stderr.substring(0, 1000),
          errorTimestamp: new Date(),
        },
      })

      await pusherServer.trigger('agent-ops', 'agent-updated', {
        agentId: agent.id,
        status: 'error',
        currentTask: `Failed: ${step.task.substring(0, 100)}`,
      })

      await prisma.activity.create({
        data: {
          agentId: agent.id,
          agentName,
          action: `error: ${errorMsg.substring(0, 100)}`,
          type: 'error',
        },
      })

      await prisma.errorLog.create({
        data: {
          agentId: agent.id,
          message: errorMsg.substring(0, 500),
          details: result.stderr.substring(0, 2000),
        },
      })

      scheduler.failStep(step.id, errorMsg, durationMs)
      console.error(`[ParallelExec] ${step.id} failed: ${errorMsg}`)
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'error',
        currentTask: `Failed: ${step.task.substring(0, 100)}`,
        lastError: errorMsg.substring(0, 200),
        errorTimestamp: new Date(),
      },
    })

    scheduler.failStep(step.id, errorMsg, durationMs)
    console.error(`[ParallelExec] ${step.id} exception: ${errorMsg}`)
  } finally {
    // CRITICAL: Always release global worker slot
    workerCoordinator.release(step.agent)
  }
}

/**
 * Execute steps in parallel with dependency awareness
 */
export async function executeStepsInParallel(
  taskId: string,
  steps: ExecutionStep[],
  scheduler: ParallelScheduler
): Promise<void> {
  console.log(`[ParallelExec] Starting parallel execution of ${steps.length} steps`)

  // Main loop: execute ready steps until all terminal
  while (!scheduler.isComplete(steps)) {
    // Get executable steps (dependencies met)
    const executable = scheduler.getExecutableSteps(steps)

    if (executable.length === 0) {
      // No steps DAG-ready. Mark any steps whose dependencies failed/skipped.
      scheduler.processSkippedSteps(steps)

      // Determine whether we are waiting on a running step or truly deadlocked.
      let hasRunningStep = false
      let hasPendingStep = false
      for (const step of steps) {
        const state = scheduler.getStepState(step.id)
        if (state?.status === 'running') hasRunningStep = true
        if (state?.status === 'pending') hasPendingStep = true
      }

      if (hasPendingStep && !hasRunningStep) {
        // Pending steps remain but nothing is running and nothing is ready.
        // If still not terminal after skip processing, this is a deadlock.
        if (!scheduler.isComplete(steps)) {
          console.error('[ParallelExec] Deadlock detected - pending steps but none running and none ready')
          break
        }
        break
      }

      // Waiting for running steps to finish (or all terminal).
      await new Promise((resolve) => setTimeout(resolve, 100))
      continue
    }

    console.log(
      `[ParallelExec] Starting parallel batch (${executable.length} steps): ${executable.map((s) => s.id).join(', ')}`
    )

    // Execute batch in parallel.
    // Each step blocks on workerCoordinator.acquire() if the agent is busy
    // or global capacity is exhausted, then releases in finally.
    await Promise.allSettled(
      executable.map((step) => executeStep(taskId, step, scheduler))
    )

    // Process any newly skipped steps after this batch
    scheduler.processSkippedSteps(steps)
  }

  console.log('[ParallelExec] All steps complete')
}
