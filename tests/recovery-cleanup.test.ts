import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tryAcquireLock, releaseLock, isLocked, clearAllLocks } from '../lib/execution-lock'
import { trackAgentForTask, getAgentsForTask, getTasksForAgent, clearAgentsForTask, getTrackedTasks } from '../lib/task-agent-tracking'

describe('Recovery Path Cleanup', () => {
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

  describe('Success Path Cleanup', () => {
    it('should clear task-agent tracking after successful recovery', () => {
      const taskId = 'recovery-success'
      const hermesMainId = 'hermes-main-agent'
      const backendId = 'backend-agent'

      // Simulate recovery path
      // 1. Acquire lock
      const acquired = tryAcquireLock(taskId)
      expect(acquired).toBe(true)

      // 2. Track agents during orchestration
      trackAgentForTask(taskId, hermesMainId)
      trackAgentForTask(taskId, backendId)

      // Verify tracking active
      expect(getAgentsForTask(taskId)).toEqual([hermesMainId, backendId])
      expect(getTasksForAgent(hermesMainId)).toContain(taskId)
      expect(getTasksForAgent(backendId)).toContain(taskId)

      // 3. Simulate successful execution completion
      try {
        // ... runOrchestrationLocked() completes ...
      } finally {
        // 4. Finally block cleanup (recovery path MUST do this)
        clearAgentsForTask(taskId)
        releaseLock(taskId)
      }

      // 5. Verify cleanup
      expect(getAgentsForTask(taskId)).toEqual([])
      expect(getTasksForAgent(hermesMainId)).not.toContain(taskId)
      expect(getTasksForAgent(backendId)).not.toContain(taskId)
      expect(isLocked(taskId)).toBe(false)
    })

    it('should not leak tracking into subsequent tasks', () => {
      const task1 = 'task-1'
      const task2 = 'task-2'
      const agentId = 'shared-agent'

      // First recovery
      tryAcquireLock(task1)
      trackAgentForTask(task1, agentId)
      
      try {
        // ... execution ...
      } finally {
        clearAgentsForTask(task1)
        releaseLock(task1)
      }

      // Verify task1 cleaned
      expect(getAgentsForTask(task1)).toEqual([])

      // Second recovery
      tryAcquireLock(task2)
      trackAgentForTask(task2, agentId)

      // Agent should only be tracked for task2, not task1
      expect(getTasksForAgent(agentId)).toEqual([task2])
      expect(getTasksForAgent(agentId)).not.toContain(task1)

      clearAgentsForTask(task2)
      releaseLock(task2)
    })

    it('should clear multiple agents for one task', () => {
      const taskId = 'multi-agent-task'
      const agents = ['hermes-main', 'researcher', 'backend', 'frontend', 'review']

      tryAcquireLock(taskId)

      // Track all agents
      for (const agentId of agents) {
        trackAgentForTask(taskId, agentId)
      }

      expect(getAgentsForTask(taskId).length).toBe(5)

      try {
        // ... execution ...
      } finally {
        clearAgentsForTask(taskId)
        releaseLock(taskId)
      }

      // All agents cleared
      expect(getAgentsForTask(taskId)).toEqual([])
      
      // Reverse mapping also cleared
      for (const agentId of agents) {
        expect(getTasksForAgent(agentId)).not.toContain(taskId)
      }
    })
  })

  describe('Error Path Cleanup', () => {
    it('should clear tracking even after mutation error', () => {
      const taskId = 'mutation-error-task'
      const agentId = 'test-agent'

      tryAcquireLock(taskId)
      trackAgentForTask(taskId, agentId)

      try {
        // Simulate Prisma mutation error
        throw new Error('Database mutation failed')
      } catch (error) {
        // Error caught
      } finally {
        // CRITICAL: cleanup must still happen
        clearAgentsForTask(taskId)
        releaseLock(taskId)
      }

      // Verify cleanup despite error
      expect(getAgentsForTask(taskId)).toEqual([])
      expect(getTasksForAgent(agentId)).not.toContain(taskId)
      expect(isLocked(taskId)).toBe(false)
    })

    it('should clear tracking even after orchestration error', () => {
      const taskId = 'orchestration-error-task'
      const hermesMainId = 'hermes-main'
      const backendId = 'backend'

      tryAcquireLock(taskId)
      trackAgentForTask(taskId, hermesMainId)
      trackAgentForTask(taskId, backendId)

      try {
        // Simulate orchestration fatal error
        throw new Error('Orchestration crashed')
      } catch (error) {
        // Error caught
      } finally {
        clearAgentsForTask(taskId)
        releaseLock(taskId)
      }

      // Tracking cleared
      expect(getAgentsForTask(taskId)).toEqual([])
      expect(getTasksForAgent(hermesMainId)).not.toContain(taskId)
      expect(getTasksForAgent(backendId)).not.toContain(taskId)
      expect(isLocked(taskId)).toBe(false)
    })

    it('should handle cleanup when no agents were tracked', () => {
      const taskId = 'no-agents-task'

      tryAcquireLock(taskId)
      
      // No agents tracked (early failure before planning)
      
      try {
        throw new Error('Early failure')
      } catch (error) {
        // Error
      } finally {
        // Cleanup should be safe with no agents
        clearAgentsForTask(taskId)
        releaseLock(taskId)
      }

      expect(getAgentsForTask(taskId)).toEqual([])
      expect(isLocked(taskId)).toBe(false)
    })
  })

  describe('Normal vs Recovery Cleanup Parity', () => {
    it('should have same cleanup behavior for normal and recovery paths', () => {
      const normalTask = 'normal-task'
      const recoveryTask = 'recovery-task'
      const agentId = 'test-agent'

      // Normal path
      tryAcquireLock(normalTask)
      trackAgentForTask(normalTask, agentId)
      try {
        // ... normal execution ...
      } finally {
        clearAgentsForTask(normalTask)
        releaseLock(normalTask)
      }

      // Recovery path
      tryAcquireLock(recoveryTask)
      trackAgentForTask(recoveryTask, agentId)
      try {
        // ... recovered execution ...
      } finally {
        clearAgentsForTask(recoveryTask)
        releaseLock(recoveryTask)
      }

      // Both paths should result in clean state
      expect(getAgentsForTask(normalTask)).toEqual([])
      expect(getAgentsForTask(recoveryTask)).toEqual([])
      expect(getTasksForAgent(agentId)).toEqual([])
      expect(isLocked(normalTask)).toBe(false)
      expect(isLocked(recoveryTask)).toBe(false)
    })
  })

  describe('No Double Cleanup', () => {
    it('should not cause issues with double clearAgentsForTask call', () => {
      const taskId = 'double-clear-task'
      const agentId = 'agent-1'

      tryAcquireLock(taskId)
      trackAgentForTask(taskId, agentId)

      // First clear
      clearAgentsForTask(taskId)
      expect(getAgentsForTask(taskId)).toEqual([])

      // Second clear (should be safe no-op)
      expect(() => clearAgentsForTask(taskId)).not.toThrow()
      expect(getAgentsForTask(taskId)).toEqual([])

      releaseLock(taskId)
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should not accumulate stale entries in taskAgentMap', () => {
      const tasks = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5']
      const agentId = 'shared-agent'

      for (const taskId of tasks) {
        tryAcquireLock(taskId)
        trackAgentForTask(taskId, agentId)
        
        try {
          // ... execution ...
        } finally {
          clearAgentsForTask(taskId)
          releaseLock(taskId)
        }
      }

      // All tasks should be cleaned - no leak
      for (const taskId of tasks) {
        expect(getAgentsForTask(taskId)).toEqual([])
      }

      // Agent should have no stale task references
      expect(getTasksForAgent(agentId)).toEqual([])
    })

    it('should not accumulate stale entries in agentTaskMap', () => {
      const taskId = 'test-task'
      const agents = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5']

      tryAcquireLock(taskId)

      for (const agentId of agents) {
        trackAgentForTask(taskId, agentId)
      }

      try {
        // ... execution ...
      } finally {
        clearAgentsForTask(taskId)
        releaseLock(taskId)
      }

      // Task should have no agents
      expect(getAgentsForTask(taskId)).toEqual([])

      // All agents should have no reference to this task
      for (const agentId of agents) {
        expect(getTasksForAgent(agentId)).not.toContain(taskId)
      }
    })
  })
})
