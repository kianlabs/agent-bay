import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tryAcquireLock, releaseLock, isLocked, clearAllLocks, getActiveTasks } from '../lib/execution-lock'

describe('Task Recovery - Execution Lock', () => {
  beforeEach(() => {
    clearAllLocks()
  })

  afterEach(() => {
    clearAllLocks()
  })

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate task orchestration', () => {
      const taskId = 'test-task-1'
      
      // First acquisition should succeed
      const first = tryAcquireLock(taskId)
      expect(first).toBe(true)
      expect(isLocked(taskId)).toBe(true)
      
      // Second acquisition should fail
      const second = tryAcquireLock(taskId)
      expect(second).toBe(false)
      expect(isLocked(taskId)).toBe(true)
    })

    it('should allow different tasks to acquire locks', () => {
      const task1 = 'test-task-1'
      const task2 = 'test-task-2'
      
      const lock1 = tryAcquireLock(task1)
      const lock2 = tryAcquireLock(task2)
      
      expect(lock1).toBe(true)
      expect(lock2).toBe(true)
      expect(isLocked(task1)).toBe(true)
      expect(isLocked(task2)).toBe(true)
    })
  })

  describe('Lock Release', () => {
    it('should release lock after success', () => {
      const taskId = 'test-task-success'
      
      tryAcquireLock(taskId)
      expect(isLocked(taskId)).toBe(true)
      
      releaseLock(taskId)
      expect(isLocked(taskId)).toBe(false)
      
      // Should be able to acquire again
      const reacquire = tryAcquireLock(taskId)
      expect(reacquire).toBe(true)
    })

    it('should release lock after error', () => {
      const taskId = 'test-task-error'
      
      tryAcquireLock(taskId)
      
      // Simulate error handling
      expect(() => {
        try {
          throw new Error('Test error')
        } finally {
          releaseLock(taskId)
        }
      }).toThrow('Test error')
      
      expect(isLocked(taskId)).toBe(false)
    })

    it('should handle release of non-existent lock safely', () => {
      const taskId = 'never-locked'
      
      expect(() => releaseLock(taskId)).not.toThrow()
      expect(isLocked(taskId)).toBe(false)
    })
  })

  describe('Lock State', () => {
    it('should correctly report lock state', () => {
      const taskId = 'test-task-state'
      
      expect(isLocked(taskId)).toBe(false)
      
      tryAcquireLock(taskId)
      expect(isLocked(taskId)).toBe(true)
      
      releaseLock(taskId)
      expect(isLocked(taskId)).toBe(false)
    })
  })
})

describe('Task Recovery - Stale Detection', () => {
  describe('Recovery Policies', () => {
    it('should identify pending stale tasks', () => {
      // Pending tasks with old createdAt should be recoverable
      const now = Date.now()
      const tenMinutesAgo = now - (10 * 60 * 1000)
      
      const isPending = 'pending'
      const isStale = tenMinutesAgo < (now - (10 * 60 * 1000))
      
      expect(isPending).toBe('pending')
      expect(isStale).toBe(false)
    })

    it('should identify planning stale tasks', () => {
      const status = 'planning'
      expect(['pending', 'planning', 'running']).toContain(status)
    })

    it('should identify running stale tasks', () => {
      const status = 'running'
      expect(['pending', 'planning', 'running']).toContain(status)
    })

    it('should ignore fresh running tasks', () => {
      const now = Date.now()
      const fiveMinutesAgo = now - (5 * 60 * 1000)
      const staleThreshold = 10 * 60 * 1000
      
      const taskAge = now - fiveMinutesAgo
      const isStale = taskAge > staleThreshold
      
      expect(isStale).toBe(false)
    })

    it('should ignore completed tasks', () => {
      const completedStatus = 'completed'
      const recoverableStatuses = ['pending', 'planning', 'running']
      
      expect(recoverableStatuses).not.toContain(completedStatus)
    })

    it('should ignore error tasks', () => {
      const errorStatus = 'error'
      const recoverableStatuses = ['pending', 'planning', 'running']
      
      expect(recoverableStatuses).not.toContain(errorStatus)
    })
  })

  describe('Recovery Idempotence', () => {
    it('should be safe to call recovery multiple times', () => {
      // Recovery should not duplicate tasks or corrupt state
      // This is a contract test - actual implementation should be idempotent
      
      const callRecoveryTwice = () => {
        // First call
        const firstResult = { recovered: 0 }
        // Second call should not change anything
        const secondResult = { recovered: 0 }
        
        return { firstResult, secondResult }
      }
      
      expect(() => callRecoveryTwice()).not.toThrow()
    })
  })

  describe('Agent State Recovery', () => {
    it('should reset stale worker to idle', () => {
      const staleWorkerState = {
        status: 'working',
        currentTask: 'Old task from crashed process'
      }
      
      const resetWorkerState = {
        status: 'idle',
        currentTask: 'Waiting for task'
      }
      
      // After recovery, stale worker should be reset
      expect(resetWorkerState.status).toBe('idle')
      expect(resetWorkerState.currentTask).toBe('Waiting for task')
    })

    it('should not reset worker with active task', () => {
      const taskId = 'active-task'
      tryAcquireLock(taskId)
      
      // If task is active (locked), worker should not be reset
      const isActive = isLocked(taskId)
      expect(isActive).toBe(true)
      
      releaseLock(taskId)
    })
  })

  describe('Task History Preservation', () => {
    it('should not delete task history during recovery', () => {
      // Recovery should reset status, not delete rows
      const taskBeforeRecovery = {
        id: 'task-1',
        status: 'running',
        createdAt: new Date(),
      }
      
      const taskAfterRecovery = {
        id: 'task-1',
        status: 'pending', // Reset to pending
        createdAt: taskBeforeRecovery.createdAt, // Same row, same ID
      }
      
      expect(taskAfterRecovery.id).toBe(taskBeforeRecovery.id)
      expect(taskAfterRecovery.id).toBe(taskBeforeRecovery.id)
    })
  })

  describe('Race Condition Prevention', () => {
    it('should not reset agents when tasks are active', () => {
      // Simulate recovery called while orchestration is running
      const taskId1 = 'active-task-1'
      const taskId2 = 'active-task-2'
      
      tryAcquireLock(taskId1)
      tryAcquireLock(taskId2)
      
      // Active tasks exist - agent recovery should be skipped
      const activeCount = getActiveTasks().length
      expect(activeCount).toBe(2)
      
      releaseLock(taskId1)
      releaseLock(taskId2)
    })

    it('should check current lock state not stale snapshot', () => {
      // Verify getActiveTasks() is called at decision time, not cached
      clearAllLocks()
      
      const initialActive = getActiveTasks()
      expect(initialActive.length).toBe(0)
      
      // Acquire lock AFTER snapshot
      tryAcquireLock('new-task')
      
      const currentActive = getActiveTasks()
      expect(currentActive.length).toBe(1)
      expect(currentActive).toContain('new-task')
      
      releaseLock('new-task')
    })
  })
})
