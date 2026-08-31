/**
 * In-memory execution lock to prevent duplicate task orchestration
 * within the same process.
 * 
 * IMPORTANT: This is NOT a distributed lock. Only prevents duplicates
 * within the same Node.js process/instance.
 */

const activeTaskIds = new Set<string>()

/**
 * Try to acquire lock for a task
 * @returns true if lock acquired, false if already locked
 */
export function tryAcquireLock(taskId: string): boolean {
  if (activeTaskIds.has(taskId)) {
    return false
  }
  activeTaskIds.add(taskId)
  console.log(`[ExecutionLock] task ${taskId} locked`)
  return true
}

/**
 * Release lock for a task
 */
export function releaseLock(taskId: string): void {
  activeTaskIds.delete(taskId)
  console.log(`[ExecutionLock] task ${taskId} unlocked`)
}

/**
 * Check if task is currently locked
 */
export function isLocked(taskId: string): boolean {
  return activeTaskIds.has(taskId)
}

/**
 * Get all currently locked task IDs (for debugging/recovery)
 */
export function getActiveTasks(): string[] {
  return Array.from(activeTaskIds)
}

/**
 * Clear all locks (use with caution, typically only for testing)
 */
export function clearAllLocks(): void {
  const count = activeTaskIds.size
  activeTaskIds.clear()
  console.log(`[ExecutionLock] cleared ${count} locks`)
}
