import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  trackAgentForTask, 
  getAgentsForTask, 
  getTasksForAgent,
  isAgentUsedByOtherActiveTask,
  clearAgentsForTask,
  getTrackedTasks
} from '../lib/task-agent-tracking'
import { tryAcquireLock, releaseLock, isLocked, clearAllLocks } from '../lib/execution-lock'

describe('Shared Agent Protection', () => {
  beforeEach(() => {
    clearAllLocks()
    // Clear all task-agent tracking
    for (const taskId of getTrackedTasks()) {
      clearAgentsForTask(taskId)
    }
  })

  afterEach(() => {
    clearAllLocks()
    // Clear all task-agent tracking
    for (const taskId of getTrackedTasks()) {
      clearAgentsForTask(taskId)
    }
  })

  describe('BUG 1: Shared Hermes Main Protection', () => {
    it('should not reset Hermes Main if used by another active task', () => {
      const hermesMainId = 'hermes-main-agent-id'
      const taskA = 'task-A'
      const taskB = 'task-B'

      // Both tasks track Hermes Main
      trackAgentForTask(taskA, hermesMainId)
      trackAgentForTask(taskB, hermesMainId)

      // Both tasks acquire locks (both active)
      tryAcquireLock(taskA)
      tryAcquireLock(taskB)

      // Task A fails - should we reset Hermes Main?
      const hasOtherOwner = isAgentUsedByOtherActiveTask(hermesMainId, taskA, isLocked)
      
      // Hermes Main is still used by Task B (active)
      expect(hasOtherOwner).toBe(true)
      
      // Cleanup
      releaseLock(taskA)
      releaseLock(taskB)
      clearAgentsForTask(taskA)
      clearAgentsForTask(taskB)
    })

    it('should reset Hermes Main if no other active task uses it', () => {
      const hermesMainId = 'hermes-main-agent-id'
      const taskA = 'task-A'

      trackAgentForTask(taskA, hermesMainId)
      tryAcquireLock(taskA)

      // Task A completes/fails - release lock
      releaseLock(taskA)

      // No other task owns Hermes Main
      const hasOtherOwner = isAgentUsedByOtherActiveTask(hermesMainId, taskA, isLocked)
      
      expect(hasOtherOwner).toBe(false)
      
      // Safe to reset
      clearAgentsForTask(taskA)
    })

    it('should protect shared worker agents too', () => {
      const backendId = 'backend-agent-id'
      const taskA = 'task-A'
      const taskB = 'task-B'

      // Both tasks use Backend agent
      trackAgentForTask(taskA, backendId)
      trackAgentForTask(taskB, backendId)

      tryAcquireLock(taskA)
      tryAcquireLock(taskB)

      // Task A fails
      const hasOtherOwner = isAgentUsedByOtherActiveTask(backendId, taskA, isLocked)
      
      // Backend still used by Task B
      expect(hasOtherOwner).toBe(true)

      releaseLock(taskA)
      releaseLock(taskB)
      clearAgentsForTask(taskA)
      clearAgentsForTask(taskB)
    })
  })

  describe('Reverse Mapping: getTasksForAgent', () => {
    it('should return all tasks using an agent', () => {
      const agentId = 'agent-1'
      trackAgentForTask('task-A', agentId)
      trackAgentForTask('task-B', agentId)
      trackAgentForTask('task-C', agentId)

      const tasks = getTasksForAgent(agentId)
      
      expect(tasks).toContain('task-A')
      expect(tasks).toContain('task-B')
      expect(tasks).toContain('task-C')
      expect(tasks.length).toBe(3)
    })

    it('should return empty array for unused agent', () => {
      const tasks = getTasksForAgent('unknown-agent')
      expect(tasks).toEqual([])
    })

    it('should update after clearAgentsForTask', () => {
      const agentId = 'agent-1'
      trackAgentForTask('task-A', agentId)
      trackAgentForTask('task-B', agentId)

      expect(getTasksForAgent(agentId).length).toBe(2)

      clearAgentsForTask('task-A')

      const remaining = getTasksForAgent(agentId)
      expect(remaining.length).toBe(1)
      expect(remaining).toContain('task-B')
      expect(remaining).not.toContain('task-A')
    })
  })

  describe('Concurrency Scenario', () => {
    it('should handle Task A fatal while Task B active', () => {
      const hermesMainId = 'hermes-main'
      const agent1 = 'agent-1'
      const agent2 = 'agent-2'
      const agent3 = 'agent-3'

      // Task A: Hermes Main + agent1 + agent2
      trackAgentForTask('task-A', hermesMainId)
      trackAgentForTask('task-A', agent1)
      trackAgentForTask('task-A', agent2)

      // Task B: Hermes Main + agent3
      trackAgentForTask('task-B', hermesMainId)
      trackAgentForTask('task-B', agent3)

      tryAcquireLock('task-A')
      tryAcquireLock('task-B')

      // Task A fails
      releaseLock('task-A')

      // Check which agents can be reset
      const hermesShared = isAgentUsedByOtherActiveTask(hermesMainId, 'task-A', isLocked)
      const agent1Shared = isAgentUsedByOtherActiveTask(agent1, 'task-A', isLocked)
      const agent2Shared = isAgentUsedByOtherActiveTask(agent2, 'task-A', isLocked)
      const agent3Shared = isAgentUsedByOtherActiveTask(agent3, 'task-A', isLocked)

      // Hermes Main: protected (Task B still using)
      expect(hermesShared).toBe(true)

      // agent1, agent2: safe to reset (only Task A)
      expect(agent1Shared).toBe(false)
      expect(agent2Shared).toBe(false)

      // agent3: belongs to Task B (still active), NOT safe to reset
      // Even though we're checking from Task A's perspective, agent3 is used by active Task B
      expect(agent3Shared).toBe(true)

      // Task B agents still intact
      const taskBAgents = getAgentsForTask('task-B')
      expect(taskBAgents).toContain(hermesMainId)
      expect(taskBAgents).toContain(agent3)

      // Cleanup
      releaseLock('task-B')
      clearAgentsForTask('task-A')
      clearAgentsForTask('task-B')
    })
  })
})
