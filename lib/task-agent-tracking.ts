/**
 * Task-Agent Ownership Tracking
 * 
 * Tracks which agents are used by which tasks during orchestration.
 * Used for scoped cleanup on fatal errors (only reset agents for failed task).
 * 
 * In-memory only, single-process scope.
 */

// Map<taskId, Set<agentId>>
const taskAgentMap = new Map<string, Set<string>>()

// Reverse map: Map<agentId, Set<taskId>>
const agentTaskMap = new Map<string, Set<string>>()

/**
 * Register an agent as being used by a task
 */
export function trackAgentForTask(taskId: string, agentId: string): void {
  // Forward: task → agents
  if (!taskAgentMap.has(taskId)) {
    taskAgentMap.set(taskId, new Set())
  }
  taskAgentMap.get(taskId)!.add(agentId)
  
  // Reverse: agent → tasks
  if (!agentTaskMap.has(agentId)) {
    agentTaskMap.set(agentId, new Set())
  }
  agentTaskMap.get(agentId)!.add(taskId)
}

/**
 * Get all agents used by a specific task
 */
export function getAgentsForTask(taskId: string): string[] {
  return Array.from(taskAgentMap.get(taskId) || [])
}

/**
 * Get all tasks using a specific agent
 */
export function getTasksForAgent(agentId: string): string[] {
  return Array.from(agentTaskMap.get(agentId) || [])
}

/**
 * Check if an agent is used by other active tasks (excluding specified task)
 */
export function isAgentUsedByOtherActiveTask(agentId: string, excludingTaskId: string, isLockedFn: (id: string) => boolean): boolean {
  const tasks = getTasksForAgent(agentId)
  
  for (const taskId of tasks) {
    if (taskId !== excludingTaskId && isLockedFn(taskId)) {
      return true
    }
  }
  
  return false
}

/**
 * Clear agent tracking for a task (after completion or error)
 * Also removes reverse mapping
 */
export function clearAgentsForTask(taskId: string): void {
  const agents = taskAgentMap.get(taskId)
  
  if (agents) {
    // Remove from reverse map
    for (const agentId of agents) {
      const tasks = agentTaskMap.get(agentId)
      if (tasks) {
        tasks.delete(taskId)
        if (tasks.size === 0) {
          agentTaskMap.delete(agentId)
        }
      }
    }
  }
  
  taskAgentMap.delete(taskId)
}

/**
 * Get all tracked task IDs
 */
export function getTrackedTasks(): string[] {
  return Array.from(taskAgentMap.keys())
}

