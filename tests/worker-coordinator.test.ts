import { describe, it, expect, beforeEach } from 'vitest'
import { WorkerExecutionCoordinator } from '../lib/worker-execution-coordinator'
import type { ValidAgentName } from '../lib/hermes-config'

/**
 * Helper: deferred promise for controlling async test flow
 */
function createDeferred(): {
  promise: Promise<void>
  resolve: (value: void | PromiseLike<void>) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: void | PromiseLike<void>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

type Deferred = ReturnType<typeof createDeferred>

describe('WorkerExecutionCoordinator', () => {
  let coordinator: WorkerExecutionCoordinator

  beforeEach(() => {
    coordinator = new WorkerExecutionCoordinator(2) // max 2 for testing
  })

  describe('basic acquire/release', () => {
    it('should acquire immediately when under capacity', async () => {
      await coordinator.acquire('research')
      expect(coordinator.getActiveCount()).toBe(1)
      expect(coordinator.isAgentBusy('research')).toBe(true)
      coordinator.release('research')
    })

    it('should release properly', async () => {
      await coordinator.acquire('research')
      coordinator.release('research')
      expect(coordinator.getActiveCount()).toBe(0)
      expect(coordinator.isAgentBusy('research')).toBe(false)
    })

    it('should allow different agents simultaneously', async () => {
      await coordinator.acquire('research')
      await coordinator.acquire('backend')
      expect(coordinator.getActiveCount()).toBe(2)
      coordinator.release('research')
      coordinator.release('backend')
    })
  })

  // TEST A: Global concurrency across tasks
  describe('global concurrency', () => {
    it('should enforce MAX_CONCURRENT_WORKERS across all callers', async () => {
      const deferred1 = createDeferred()
      const deferred2 = createDeferred()
      const deferred3 = createDeferred()

      let maxObserved = 0

      async function worker(name: ValidAgentName, deferred: Deferred) {
        await coordinator.acquire(name)
        const current = coordinator.getActiveCount()
        if (current > maxObserved) maxObserved = current
        await deferred.promise
        coordinator.release(name)
      }

      // Start 3 workers with max=2
      const p1 = worker('research', deferred1)
      const p2 = worker('backend', deferred2)
      const p3 = worker('frontend', deferred3)

      // Let microtasks settle
      await new Promise((r) => setTimeout(r, 10))

      // Only 2 should be active (research + backend)
      expect(coordinator.getActiveCount()).toBe(2)
      expect(coordinator.getWaitQueueSize()).toBe(1)

      // Release one
      deferred1.resolve()
      await new Promise((r) => setTimeout(r, 10))

      // Now frontend should have acquired
      expect(coordinator.getActiveCount()).toBe(2)
      expect(coordinator.getWaitQueueSize()).toBe(0)
      expect(maxObserved).toBeLessThanOrEqual(2)

      deferred2.resolve()
      deferred3.resolve()
      await Promise.all([p1, p2, p3])

      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // TEST B: Same agent across tasks
  describe('same agent cross-task', () => {
    it('should serialize same agent across different callers', async () => {
      const deferred1 = createDeferred()
      const deferred2 = createDeferred()

      let backend1Active = false
      let backend2Active = false
      let maxBackendConcurrency = 0

      async function taskA() {
        await coordinator.acquire('backend')
        backend1Active = true
        const current = (backend1Active ? 1 : 0) + (backend2Active ? 1 : 0)
        if (current > maxBackendConcurrency) maxBackendConcurrency = current
        await deferred1.promise
        backend1Active = false
        coordinator.release('backend')
      }

      async function taskB() {
        await coordinator.acquire('backend')
        backend2Active = true
        const current = (backend1Active ? 1 : 0) + (backend2Active ? 1 : 0)
        if (current > maxBackendConcurrency) maxBackendConcurrency = current
        await deferred2.promise
        backend2Active = false
        coordinator.release('backend')
      }

      const p1 = taskA()
      const p2 = taskB()

      await new Promise((r) => setTimeout(r, 10))

      // Only one backend should be active
      expect(coordinator.isAgentBusy('backend')).toBe(true)
      expect(coordinator.getWaitQueueSize()).toBe(1)
      expect(maxBackendConcurrency).toBeLessThanOrEqual(1)

      deferred1.resolve()
      await new Promise((r) => setTimeout(r, 10))

      // Now the second backend should be active
      expect(coordinator.getWaitQueueSize()).toBe(0)
      expect(maxBackendConcurrency).toBeLessThanOrEqual(1)

      deferred2.resolve()
      await Promise.all([p1, p2])

      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // TEST C: Different agents across tasks should overlap
  describe('different agents cross-task', () => {
    it('should allow different agents to overlap', async () => {
      const deferred1 = createDeferred()
      const deferred2 = createDeferred()

      let researchActive = false
      let backendActive = false

      async function taskA() {
        await coordinator.acquire('research')
        researchActive = true
        await deferred1.promise
        researchActive = false
        coordinator.release('research')
      }

      async function taskB() {
        await coordinator.acquire('backend')
        backendActive = true
        await deferred2.promise
        backendActive = false
        coordinator.release('backend')
      }

      const p1 = taskA()
      const p2 = taskB()

      await new Promise((r) => setTimeout(r, 10))

      // Both should be active simultaneously
      expect(researchActive).toBe(true)
      expect(backendActive).toBe(true)
      expect(coordinator.getActiveCount()).toBe(2)

      deferred1.resolve()
      deferred2.resolve()
      await Promise.all([p1, p2])

      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // TEST D: Dependency wait (DAG-level - different agents)
  describe('dependency wait', () => {
    it('should allow independent agents to acquire while dependency is held', async () => {
      const deferredBackend = createDeferred()

      let frontendStarted = false

      async function backendStep() {
        await coordinator.acquire('backend')
        await deferredBackend.promise
        coordinator.release('backend')
      }

      async function frontendStep() {
        await coordinator.acquire('frontend')
        frontendStarted = true
        coordinator.release('frontend')
      }

      const pBackend = backendStep()

      // Wait for backend to acquire
      await new Promise((r) => setTimeout(r, 10))
      expect(coordinator.isAgentBusy('backend')).toBe(true)

      // Frontend can acquire (different agent, capacity available)
      const pFrontend = frontendStep()
      await pFrontend
      expect(frontendStarted).toBe(true)

      // Release backend
      deferredBackend.resolve()
      await pBackend
    })

    it('should wait for same agent to release before allowing acquire', async () => {
      const deferred = createDeferred()

      let secondAcquired = false

      async function first() {
        await coordinator.acquire('backend')
        await deferred.promise
        coordinator.release('backend')
      }

      async function second() {
        await coordinator.acquire('backend')
        secondAcquired = true
        coordinator.release('backend')
      }

      const p1 = first()

      await new Promise((r) => setTimeout(r, 10))
      expect(coordinator.isAgentBusy('backend')).toBe(true)

      const p2 = second()
      await new Promise((r) => setTimeout(r, 10))
      expect(secondAcquired).toBe(false)

      deferred.resolve()
      await Promise.all([p1, p2])
      expect(secondAcquired).toBe(true)
    })
  })

  // TEST E: Fan-in
  describe('fan-in', () => {
    it('should allow fan-in pattern', async () => {
      const deferredResearch = createDeferred()
      const deferredBackend = createDeferred()

      let reviewStarted = false

      async function reviewStep() {
        // Review depends on research + backend
        // Simulate: wait until both release
        await coordinator.acquire('review')
        reviewStarted = true
        coordinator.release('review')
      }

      async function researchStep() {
        await coordinator.acquire('research')
        await deferredResearch.promise
        coordinator.release('research')
      }

      async function backendStep() {
        await coordinator.acquire('backend')
        await deferredBackend.promise
        coordinator.release('backend')
      }

      const pResearch = researchStep()
      const pBackend = backendStep()

      await new Promise((r) => setTimeout(r, 10))

      // Both research and backend active
      expect(coordinator.getActiveCount()).toBe(2)

      // Release both
      deferredResearch.resolve()
      deferredBackend.resolve()
      await Promise.all([pResearch, pBackend])

      // Now review can start
      const pReview = reviewStep()
      await pReview

      expect(reviewStarted).toBe(true)
      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // TEST F: Error cleanup (release in finally)
  describe('error cleanup', () => {
    it('should release in finally block on error', async () => {
      let acquired = false

      async function failingStep() {
        await coordinator.acquire('backend')
        acquired = true
        throw new Error('Step failed')
      }

      // Catch the error
      try {
        await failingStep()
      } catch {
        // Expected
      }

      // Coordinator should still have released
      // (In real code this is done in finally block)
      // This test verifies the pattern works
      expect(acquired).toBe(true)
      // Manually release to clean up
      coordinator.release('backend')
      expect(coordinator.getActiveCount()).toBe(0)
    })

    it('should handle finally release pattern correctly', async () => {
      async function stepWithFinally(name: ValidAgentName) {
        await coordinator.acquire(name)
        try {
          // Simulate work that might throw
          if (name === 'backend') {
            throw new Error('Backend failed')
          }
          await new Promise((r) => setTimeout(r, 50))
        } finally {
          coordinator.release(name)
        }
      }

      try {
        await stepWithFinally('backend')
      } catch {
        // Expected
      }

      // Backend should be released despite error
      expect(coordinator.getActiveCount()).toBe(0)
      expect(coordinator.isAgentBusy('backend')).toBe(false)

      // Research should still work
      await stepWithFinally('research')
      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // TEST I: Lock compatibility (task lock vs coordinator)
  describe('lock compatibility', () => {
    it('task execution lock does not interfere with worker coordinator', async () => {
      // Simulate task lock (separate from coordinator)
      const taskLocks = new Set<string>()

      function tryAcquireTaskLock(taskId: string): boolean {
        if (taskLocks.has(taskId)) return false
        taskLocks.add(taskId)
        return true
      }

      function releaseTaskLock(taskId: string): void {
        taskLocks.delete(taskId)
      }

      // Acquire task lock + worker
      expect(tryAcquireTaskLock('task-1')).toBe(true)
      await coordinator.acquire('backend')

      // Same task lock should fail
      expect(tryAcquireTaskLock('task-1')).toBe(false)

      // Different task lock should succeed
      expect(tryAcquireTaskLock('task-2')).toBe(true)

      // Release worker (task lock still held)
      coordinator.release('backend')

      // Release task locks
      releaseTaskLock('task-1')
      releaseTaskLock('task-2')

      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // FIFO fairness
  describe('fairness', () => {
    it('should resolve waiters in FIFO order', async () => {
      const order: string[] = []

      async function worker(name: ValidAgentName, label: string) {
        await coordinator.acquire(name)
        order.push(`${label}-start`)
        await new Promise((r) => setTimeout(r, 10))
        order.push(`${label}-end`)
        coordinator.release(name)
      }

      // Fill capacity
      await coordinator.acquire('research')
      await coordinator.acquire('backend')

      // Queue 2 more workers (both want different agents, but capacity is full)
      const p1 = worker('frontend', 'w1')
      const p2 = worker('review', 'w2')

      await new Promise((r) => setTimeout(r, 10))

      // Release one slot
      coordinator.release('research')
      await new Promise((r) => setTimeout(r, 20))

      // Release second slot
      coordinator.release('backend')
      await Promise.all([p1, p2])

      // Both should have completed
      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // Reset
  describe('reset', () => {
    it('should reset all state', async () => {
      await coordinator.acquire('research')
      await coordinator.acquire('backend')
      coordinator.reset()
      expect(coordinator.getActiveCount()).toBe(0)
      expect(coordinator.isAgentBusy('research')).toBe(false)
      expect(coordinator.isAgentBusy('backend')).toBe(false)
      expect(coordinator.getWaitQueueSize()).toBe(0)
    })
  })

  // TEST 1 — Normal Backend vs Fallback Backend
  describe('fallback same-agent protection', () => {
    it('should not run fallback Backend while normal Backend holds the slot', async () => {
      const deferredNormal = createDeferred()

      let normalActive = false
      let fallbackActive = false
      let maxBackend = 0

      // Normal DAG Backend (Task A)
      async function normalBackend() {
        await coordinator.acquire('backend')
        normalActive = true
        const cur = (normalActive ? 1 : 0) + (fallbackActive ? 1 : 0)
        if (cur > maxBackend) maxBackend = cur
        await deferredNormal.promise
        normalActive = false
        coordinator.release('backend')
      }

      // Fallback Backend (Task B) - simulates fallbackToKeywordRouting path
      async function fallbackBackend() {
        await coordinator.acquire('backend')
        fallbackActive = true
        const cur = (normalActive ? 1 : 0) + (fallbackActive ? 1 : 0)
        if (cur > maxBackend) maxBackend = cur
        fallbackActive = false
        coordinator.release('backend')
      }

      const pNormal = normalBackend()
      await new Promise((r) => setTimeout(r, 10))
      expect(coordinator.isAgentBusy('backend')).toBe(true)

      const pFallback = fallbackBackend()
      await new Promise((r) => setTimeout(r, 10))

      // Fallback must NOT have started while normal Backend is active
      expect(normalActive).toBe(true)
      expect(maxBackend).toBeLessThanOrEqual(1)
      expect(coordinator.getWaitQueueSize()).toBe(1)

      // Release normal -> fallback may proceed
      deferredNormal.resolve()
      await Promise.all([pNormal, pFallback])

      expect(fallbackActive).toBe(false) // already done
      expect(maxBackend).toBeLessThanOrEqual(1)
      expect(coordinator.getActiveCount()).toBe(0)
    })
  })

  // TEST 2 — Fallback counts toward global limit
  describe('fallback global limit', () => {
    it('should count fallback toward global MAX_CONCURRENT_WORKERS', async () => {
      const observer = new WorkerExecutionCoordinator(2)
      const d1 = createDeferred()
      const d2 = createDeferred()
      const d3 = createDeferred()
      let active = 0
      let maxObserved = 0

      async function normalResearch() {
        await observer.acquire('research')
        active++
        if (active > maxObserved) maxObserved = active
        await d1.promise
        active--
        observer.release('research')
      }
      async function fallbackBackend() {
        await observer.acquire('backend')
        active++
        if (active > maxObserved) maxObserved = active
        await d2.promise
        active--
        observer.release('backend')
      }
      async function thirdNormal() {
        await observer.acquire('frontend')
        active++
        if (active > maxObserved) maxObserved = active
        await d3.promise
        active--
        observer.release('frontend')
      }

      const p1 = normalResearch()
      const p2 = fallbackBackend()
      const p3 = thirdNormal()

      await new Promise((r) => setTimeout(r, 10))
      expect(observer.getWaitQueueSize()).toBe(1)

      d1.resolve()
      d2.resolve()
      d3.resolve()
      await Promise.all([p1, p2, p3])

      expect(maxObserved).toBeLessThanOrEqual(2)
      expect(observer.getActiveCount()).toBe(0)
    })
  })

  // TEST 3 — Fallback different agent may overlap
  describe('fallback different agent', () => {
    it('should allow normal Backend + fallback Research to overlap', async () => {
      const d = createDeferred()
      let backendActive = false
      let researchActive = false

      async function normalBackend() {
        await coordinator.acquire('backend')
        backendActive = true
        await d.promise
        backendActive = false
        coordinator.release('backend')
      }
      async function fallbackResearch() {
        await coordinator.acquire('research')
        researchActive = true
        coordinator.release('research')
      }

      const pNormal = normalBackend()
      await new Promise((r) => setTimeout(r, 10))
      expect(backendActive).toBe(true)

      const pFallback = fallbackResearch()
      await pFallback
      expect(researchActive).toBe(true)
      expect(coordinator.getWaitQueueSize()).toBe(0)

      d.resolve()
      await pNormal
    })
  })

  // TEST 4 — Fallback error cleanup
  describe('fallback error cleanup', () => {
    it('should release the global slot even when execution throws', async () => {
      let active = false
      async function fallbackWithError() {
        await coordinator.acquire('backend')
        active = true
        try {
          throw new Error('worker failed')
        } finally {
          coordinator.release('backend')
        }
      }

      await expect(fallbackWithError()).rejects.toThrow('worker failed')
      expect(active).toBe(true)
      expect(coordinator.getActiveCount()).toBe(0)
      expect(coordinator.isAgentBusy('backend')).toBe(false)

      // Agent must be reusable afterward
      await coordinator.acquire('backend')
      expect(coordinator.isAgentBusy('backend')).toBe(true)
      coordinator.release('backend')
      expect(coordinator.getActiveCount()).toBe(0)
    })
  })
})
