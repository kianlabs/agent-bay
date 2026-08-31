/**
 * Task Recovery System
 * 
 * Recovers stale/orphaned tasks that were interrupted by:
 * - Next.js restart
 * - Process crash
 * - Orchestration timeout
 * 
 * Recovery is idempotent and safe to call multiple times.
 */

import { prisma } from './prisma'
import { TASK_STALE_AFTER_MS, RECOVERABLE_STATUSES, CORE_WORKERS } from './task-recovery-config'
import { getActiveTasks, tryAcquireLock, releaseLock } from './execution-lock'
import { runOrchestrationLocked } from './hermes-orchestrator'
import { clearAgentsForTask } from './task-agent-tracking'

/**
 * Scan for stale tasks and recover them
 * 
 * Recovery policies:
 * - pending stale: re-run orchestration
 * - planning stale: reset and re-run orchestration
 * - running stale: reset workers, requeue, re-run orchestration
 * 
 * Tasks currently active (in execution lock) are skipped.
 * 
 * Order: reset orphan agents FIRST, then recover tasks to avoid race condition.
 */
export async function recoverStaleTasks(): Promise<void> {
  console.log('[TaskRecovery] Scanning for stale tasks...')

  try {
    const staleThreshold = new Date(Date.now() - TASK_STALE_AFTER_MS)

    // Find stale tasks (use startedAt or createdAt as proxy for last activity)
    const staleTasks = await prisma.task.findMany({
      where: {
        status: { in: RECOVERABLE_STATUSES as unknown as string[] },
        OR: [
          // Tasks that started long ago
          {
            startedAt: { lt: staleThreshold, not: null },
          },
          // Or pending tasks created long ago
          {
            status: 'pending',
            createdAt: { lt: staleThreshold },
          },
        ],
      },
      select: {
        id: true,
        prompt: true,
        status: true,
        startedAt: true,
        createdAt: true,
      },
    })

    console.log(`[TaskRecovery] Found ${staleTasks.length} stale tasks (threshold: ${TASK_STALE_AFTER_MS}ms)`)

    // STEP 1: Reset orphan agents BEFORE starting any orchestrations
    // This prevents race where new orchestration's agents get reset
    await recoverStaleAgents()

    // STEP 2: Now recover stale tasks (will start orchestrations)
    const activeTaskIds = getActiveTasks()
    
    for (const task of staleTasks) {
      // Skip if task is currently active in this process
      if (activeTaskIds.includes(task.id)) {
        console.log(`[TaskRecovery] Skipped active task ${task.id}`)
        continue
      }

      const taskAge = task.startedAt
        ? Date.now() - task.startedAt.getTime()
        : Date.now() - task.createdAt.getTime()

      console.log(
        `[TaskRecovery] Recovering task ${task.id} (status: ${task.status}, age: ${taskAge}ms)`
      )

      // Apply recovery policy based on status
      await recoverTask(task.id, task.status, task.prompt)
    }

    console.log('[TaskRecovery] Recovery scan complete')
  } catch (error) {
    console.error('[TaskRecovery] Recovery scan failed:', error)
    // Don't throw - recovery should be best-effort
  }
}

/**
 * Recover a single stale task based on its status
 * Acquires execution lock before mutation to prevent TOCTOU race
 * 
 * CRITICAL: Lock acquisition provides exclusive process-local ownership,
 * ensuring no concurrent orchestration can corrupt DB state during recovery.
 */
async function recoverTask(taskId: string, status: string, prompt: string): Promise<void> {
  try {
    // CRITICAL: Acquire lock for exclusive ownership (not just check)
    if (!tryAcquireLock(taskId)) {
      console.log(`[TaskRecovery] Skipping task ${taskId} - currently active`)
      return
    }

    try {
      console.log(`[TaskRecovery] Recovered task ${taskId} (was ${status})`)

      if (status === 'pending') {
        // pending stale: just re-run orchestration
        // Lock already acquired, call internal implementation
        console.log(`[TaskRecovery] Re-running pending task ${taskId}`)
        await runOrchestrationLocked(taskId, prompt)
        
      } else if (status === 'planning') {
        // planning stale: reset to pending, then re-run
        console.log(`[TaskRecovery] Resetting planning task ${taskId} to pending`)
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'pending',
            plan: null, // Clear partial plan
          },
        })
        await runOrchestrationLocked(taskId, prompt)
        
      } else if (status === 'running') {
        // running stale: can't resume old Hermes process, reset and restart
        console.log(`[TaskRecovery] Resetting running task ${taskId} to pending`)
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'pending',
            agentResults: null, // Clear partial results
          },
        })
        await runOrchestrationLocked(taskId, prompt)
      }
      
    } finally {
      // Always clear tracking and release lock after recovery
      clearAgentsForTask(taskId)
      releaseLock(taskId)
    }
  } catch (error) {
    console.error(`[TaskRecovery] Failed to recover task ${taskId}:`, error)
  }
}

/**
 * Recover agents stuck in working state with no active task
 * 
 * Checks CURRENT lock state immediately before reset to avoid race conditions.
 * Does not rely on stale snapshots from earlier in recovery flow.
 */
export async function recoverStaleAgents(): Promise<void> {
  try {
    // Find agents (including Hermes Main) that are stuck working
    const staleAgents = await prisma.agent.findMany({
      where: {
        status: 'working',
      },
      select: {
        id: true,
        name: true,
        currentTask: true,
      },
    })

    if (staleAgents.length === 0) {
      return
    }

    console.log(`[TaskRecovery] Found ${staleAgents.length} agents in working state`)

    // Check CURRENT active tasks immediately before reset (avoid stale snapshot race)
    const currentActiveTasks = getActiveTasks()
    
    // If there are active tasks, agents might be legitimately working
    // Only reset if no tasks are running in this process
    if (currentActiveTasks.length > 0) {
      console.log(`[TaskRecovery] Skipping agent recovery - ${currentActiveTasks.length} tasks currently active`)
      return
    }

    // No active tasks, reset all working agents
    for (const agent of staleAgents) {
      console.log(`[TaskRecovery] Resetting stale agent ${agent.name} to idle`)
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'idle',
          currentTask: 'Waiting for task',
        },
      })
    }

    console.log(`[TaskRecovery] Reset ${staleAgents.length} stale agents`)
  } catch (error) {
    console.error('[TaskRecovery] Failed to recover stale agents:', error)
  }
}
