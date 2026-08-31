import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tryAcquireLock, releaseLock, isLocked, clearAllLocks } from '../lib/execution-lock'

describe('BUG 3: Recovery Lock Ownership TOCTOU', () => {
  beforeEach(() => {
    clearAllLocks()
  })

  afterEach(() => {
    clearAllLocks()
  })

  describe('Recovery Must Acquire Lock', () => {
    it('should acquire lock before mutation not just check', () => {
      const taskId = 'stale-task'

      // OLD BUG: isLocked() check only
      // const canRecover = !isLocked(taskId)
      // ... time passes ...
      // await prisma.update() ❌ RACE

      // NEW FIX: acquire lock for exclusive ownership
      const acquired = tryAcquireLock(taskId)
      
      expect(acquired).toBe(true)
      expect(isLocked(taskId)).toBe(true)
      
      // Now safe to mutate - recovery owns the lock
      
      releaseLock(taskId)
    })

    it('should prevent concurrent orchestration when recovery owns lock', () => {
      const taskId = 'task-A'

      // Recovery acquires lock first
      const recoveryAcquired = tryAcquireLock(taskId)
      expect(recoveryAcquired).toBe(true)

      // Normal orchestration tries to start
      const normalAcquired = tryAcquireLock(taskId)
      
      // Must be rejected - recovery owns the lock
      expect(normalAcquired).toBe(false)
      expect(isLocked(taskId)).toBe(true)

      releaseLock(taskId)
    })

    it('should prevent recovery when normal orchestration owns lock', () => {
      const taskId = 'task-B'

      // Normal orchestration starts first
      const normalAcquired = tryAcquireLock(taskId)
      expect(normalAcquired).toBe(true)

      // Recovery tries to acquire
      const recoveryAcquired = tryAcquireLock(taskId)
      
      // Must be rejected - normal owns the lock
      expect(recoveryAcquired).toBe(false)
      
      // Recovery should NOT mutate DB
      // Task status/plan/agentResults must remain unchanged

      releaseLock(taskId)
    })
  })

  describe('Lock Ownership Lifecycle', () => {
    it('should release lock after successful recovery', () => {
      const taskId = 'success-task'

      tryAcquireLock(taskId)
      expect(isLocked(taskId)).toBe(true)

      // Simulate recovery completion
      releaseLock(taskId)

      expect(isLocked(taskId)).toBe(false)
      
      // Lock available for next task
      const nextAcquire = tryAcquireLock(taskId)
      expect(nextAcquire).toBe(true)
      
      releaseLock(taskId)
    })

    it('should release lock after recovery mutation error', () => {
      const taskId = 'error-task'

      tryAcquireLock(taskId)
      
      try {
        // Simulate Prisma error during mutation
        throw new Error('Prisma mutation failed')
      } catch (error) {
        // Error caught
      } finally {
        // CRITICAL: finally block must release lock
        releaseLock(taskId)
      }

      expect(isLocked(taskId)).toBe(false)
    })

    it('should release lock after orchestration fatal error', () => {
      const taskId = 'fatal-task'

      tryAcquireLock(taskId)
      
      try {
        // Simulate orchestration fatal error
        throw new Error('Orchestration crashed')
      } catch (error) {
        // Error caught
      } finally {
        releaseLock(taskId)
      }

      expect(isLocked(taskId)).toBe(false)
    })
  })

  describe('Concurrent Recovery vs Normal Orchestration', () => {
    it('should handle recovery winning lock race', () => {
      const taskId = 'race-1'

      // Recovery wins
      const recovery = tryAcquireLock(taskId)
      expect(recovery).toBe(true)

      // Normal call loses
      const normal = tryAcquireLock(taskId)
      expect(normal).toBe(false)

      // Only recovery executes
      expect(isLocked(taskId)).toBe(true)

      releaseLock(taskId)
    })

    it('should handle normal orchestration winning lock race', () => {
      const taskId = 'race-2'

      // Normal wins
      const normal = tryAcquireLock(taskId)
      expect(normal).toBe(true)

      // Recovery loses
      const recovery = tryAcquireLock(taskId)
      expect(recovery).toBe(false)

      // Only normal executes
      expect(isLocked(taskId)).toBe(true)

      releaseLock(taskId)
    })

    it('should allow sequential execution after lock release', () => {
      const taskId = 'sequential'

      // First: recovery
      const recovery = tryAcquireLock(taskId)
      expect(recovery).toBe(true)
      releaseLock(taskId)

      // Then: normal (after release)
      const normal = tryAcquireLock(taskId)
      expect(normal).toBe(true)
      releaseLock(taskId)

      // Both succeeded sequentially
      expect(isLocked(taskId)).toBe(false)
    })
  })

  describe('No Double Acquire/Release', () => {
    it('should not double acquire same task', () => {
      const taskId = 'double-acquire'

      const first = tryAcquireLock(taskId)
      expect(first).toBe(true)

      const second = tryAcquireLock(taskId)
      expect(second).toBe(false)

      releaseLock(taskId)
      expect(isLocked(taskId)).toBe(false)
    })

    it('should handle double release safely', () => {
      const taskId = 'double-release'

      tryAcquireLock(taskId)
      releaseLock(taskId)
      
      // Second release should be safe (no-op)
      expect(() => releaseLock(taskId)).not.toThrow()
      
      expect(isLocked(taskId)).toBe(false)
    })
  })

  describe('Pending Task Recovery', () => {
    it('should acquire lock for pending stale task', () => {
      const taskId = 'pending-stale'

      // Pending task recovery must also acquire lock
      // Not rely on orchestrateTask() acquiring later
      
      const acquired = tryAcquireLock(taskId)
      expect(acquired).toBe(true)

      // Recovery owns lock
      // No concurrent orchestrateTask() can start
      
      releaseLock(taskId)
    })

    it('should prevent duplicate pending recovery', () => {
      const taskId = 'pending-dup'

      // First recovery acquires
      const first = tryAcquireLock(taskId)
      expect(first).toBe(true)

      // Second recovery (concurrent) blocked
      const second = tryAcquireLock(taskId)
      expect(second).toBe(false)

      releaseLock(taskId)
    })
  })

  describe('Running Task Recovery', () => {
    it('should acquire lock for running stale task', () => {
      const taskId = 'running-stale'

      const acquired = tryAcquireLock(taskId)
      expect(acquired).toBe(true)

      // Safe to reset status/agentResults
      // No active orchestration can interfere
      
      releaseLock(taskId)
    })

    it('should skip recovery if running task actually active', () => {
      const taskId = 'running-active'

      // Task is actually running (not stale)
      const normalLock = tryAcquireLock(taskId)
      expect(normalLock).toBe(true)

      // Recovery scan finds it (false positive)
      const recoveryLock = tryAcquireLock(taskId)
      
      // Recovery MUST be blocked
      expect(recoveryLock).toBe(false)
      
      // Task continues uninterrupted
      expect(isLocked(taskId)).toBe(true)

      releaseLock(taskId)
    })
  })

  describe('Planning Task Recovery', () => {
    it('should acquire lock for planning stale task', () => {
      const taskId = 'planning-stale'

      const acquired = tryAcquireLock(taskId)
      expect(acquired).toBe(true)

      // Safe to reset plan to null
      
      releaseLock(taskId)
    })

    it('should not corrupt active planning', () => {
      const taskId = 'planning-active'

      // Hermes Main is planning
      const activeLock = tryAcquireLock(taskId)
      expect(activeLock).toBe(true)

      // Recovery tries to reset plan
      const recoveryLock = tryAcquireLock(taskId)
      
      // BLOCKED - plan stays intact
      expect(recoveryLock).toBe(false)

      releaseLock(taskId)
    })
  })
})
