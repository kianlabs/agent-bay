/**
 * Global Worker Execution Coordinator
 *
 * Process-local singleton that enforces:
 * 1. Total active workers across ALL tasks <= MAX_CONCURRENT_WORKERS
 * 2. Same logical agent (e.g. "backend") cannot execute in two tasks simultaneously
 *
 * This is a GLOBAL concern, separate from per-task execution locks.
 * Task execution locks prevent duplicate orchestration of the same task.
 * This coordinator prevents resource over-allocation across tasks.
 *
 * Uses async waiting (no busy-loop polling).
 */

import { MAX_CONCURRENT_WORKERS } from './hermes-config'
import type { ValidAgentName } from './hermes-config'

interface Waiter {
  agent: ValidAgentName
  resolve: () => void
}

export class WorkerExecutionCoordinator {
  private activeCount = 0
  private busyAgents = new Set<ValidAgentName>()
  private waitQueue: Waiter[] = []
  private readonly maxConcurrent: number

  constructor(maxConcurrent: number = MAX_CONCURRENT_WORKERS) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * Acquire a global worker slot and agent lock.
   * Resolves only when both conditions are met:
   * - activeCount < maxConcurrent
   * - agent is not busy
   *
   * Caller MUST call release() in a finally block.
   */
  async acquire(agent: ValidAgentName): Promise<void> {
    if (this.canAcquire(agent)) {
      this.activeCount++
      this.busyAgents.add(agent)
      return
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push({ agent, resolve })
    })
  }

  /**
   * Release a global worker slot and agent lock.
   * Wakes queued waiters whose conditions are now satisfied.
   * MUST be called in a finally block to prevent resource leaks.
   */
  release(agent: ValidAgentName): void {
    this.activeCount--
    this.busyAgents.delete(agent)

    this.processQueue()
  }

  /**
   * Get current active worker count (across all tasks)
   */
  getActiveCount(): number {
    return this.activeCount
  }

  /**
   * Check if a specific agent is currently busy
   */
  isAgentBusy(agent: ValidAgentName): boolean {
    return this.busyAgents.has(agent)
  }

  /**
   * Get number of waiters in queue (for testing/debugging)
   */
  getWaitQueueSize(): number {
    return this.waitQueue.length
  }

  /**
   * Reset all state (for testing only)
   */
  reset(): void {
    this.activeCount = 0
    this.busyAgents.clear()
    this.waitQueue = []
  }

  private canAcquire(agent: ValidAgentName): boolean {
    return this.activeCount < this.maxConcurrent && !this.busyAgents.has(agent)
  }

  private processQueue(): void {
    const remaining: Waiter[] = []

    for (const waiter of this.waitQueue) {
      if (this.canAcquire(waiter.agent)) {
        this.activeCount++
        this.busyAgents.add(waiter.agent)
        waiter.resolve()
      } else {
        remaining.push(waiter)
      }
    }

    this.waitQueue = remaining
  }
}

/**
 * Process-local singleton. Not distributed.
 * Uses MAX_CONCURRENT_WORKERS from hermes-config.
 */
export const workerCoordinator = new WorkerExecutionCoordinator()
