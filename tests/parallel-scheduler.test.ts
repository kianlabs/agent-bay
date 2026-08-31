import { describe, it, expect, beforeEach } from 'vitest'
import { ParallelScheduler } from '../lib/parallel-scheduler'
import type { ExecutionStep } from '../lib/dependency-graph'

describe('ParallelScheduler', () => {
  let scheduler: ParallelScheduler

  beforeEach(() => {
    scheduler = new ParallelScheduler()
  })

  describe('initialization', () => {
    it('should initialize steps as pending', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
      ]

      scheduler.initializeSteps(steps)

      const state1 = scheduler.getStepState('research-1')
      const state2 = scheduler.getStepState('backend-1')

      expect(state1?.status).toBe('pending')
      expect(state2?.status).toBe('pending')
    })
  })

  describe('DAG readiness', () => {
    it('should return all ready steps (concurrency managed externally)', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: [] },
        { id: 'review-1', agent: 'review', task: 'Review', dependencies: [] },
      ]

      scheduler.initializeSteps(steps)

      // All steps are ready (no dependencies, no concurrency filtering)
      const executable = scheduler.getExecutableSteps(steps)
      expect(executable.length).toBe(4)
    })

    it('should allow more steps after workers complete', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: [] },
        { id: 'review-1', agent: 'review', task: 'Review', dependencies: [] },
        { id: 'research-2', agent: 'research', task: 'Research 2', dependencies: [] },
      ]

      scheduler.initializeSteps(steps)

      // Start first batch
      const batch1 = scheduler.getExecutableSteps(steps)
      expect(batch1.length).toBe(5)

      // Start and complete one
      scheduler.startStep('research-1')
      scheduler.completeStep('research-1', 'Done', 1000)

      // All remaining pending steps should still be ready
      const batch2 = scheduler.getExecutableSteps(steps)
      expect(batch2.length).toBe(4)
    })
  })

  describe('same-agent serialization (DAG level)', () => {
    it('should not filter by agent availability (coordinator handles that)', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend 1', dependencies: [] },
        { id: 'backend-2', agent: 'backend', task: 'Backend 2', dependencies: [] },
      ]

      scheduler.initializeSteps(steps)

      // Both steps are ready from DAG perspective (no dependencies)
      // Same-agent serialization is handled by the coordinator, not the scheduler
      const batch1 = scheduler.getExecutableSteps(steps)
      expect(batch1.length).toBe(2)
    })

    it('should allow different agents to be ready in parallel', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
      ]

      scheduler.initializeSteps(steps)

      const batch = scheduler.getExecutableSteps(steps)
      expect(batch.length).toBe(2)
    })
  })

  describe('dependency handling', () => {
    it('should wait for dependencies to complete', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      scheduler.initializeSteps(steps)

      // Only backend-1 should be executable
      const batch1 = scheduler.getExecutableSteps(steps)
      expect(batch1.length).toBe(1)
      expect(batch1[0].id).toBe('backend-1')

      // Start backend-1
      scheduler.startStep('backend-1')

      // Frontend still can't run
      const batch2 = scheduler.getExecutableSteps(steps)
      expect(batch2.length).toBe(0)

      // Complete backend-1
      scheduler.completeStep('backend-1', 'Done', 1000)

      // Now frontend-1 should be executable
      const batch3 = scheduler.getExecutableSteps(steps)
      expect(batch3.length).toBe(1)
      expect(batch3[0].id).toBe('frontend-1')
    })

    it('should support fan-in (multiple dependencies)', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        {
          id: 'review-1',
          agent: 'review',
          task: 'Review',
          dependencies: ['research-1', 'backend-1'],
        },
      ]

      scheduler.initializeSteps(steps)

      // Research and Backend can run in parallel
      const batch1 = scheduler.getExecutableSteps(steps)
      expect(batch1.length).toBe(2)

      // Start both
      scheduler.startStep('research-1')
      scheduler.startStep('backend-1')

      // Review can't run yet
      const batch2 = scheduler.getExecutableSteps(steps)
      expect(batch2.length).toBe(0)

      // Complete research
      scheduler.completeStep('research-1', 'Done', 1000)

      // Review still can't run (backend not done)
      const batch3 = scheduler.getExecutableSteps(steps)
      expect(batch3.length).toBe(0)

      // Complete backend
      scheduler.completeStep('backend-1', 'Done', 1000)

      // Now review can run
      const batch4 = scheduler.getExecutableSteps(steps)
      expect(batch4.length).toBe(1)
      expect(batch4[0].id).toBe('review-1')
    })
  })

  describe('failure propagation', () => {
    it('should skip dependent steps when dependency fails', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      scheduler.initializeSteps(steps)

      // Start and fail backend-1
      scheduler.startStep('backend-1')
      scheduler.failStep('backend-1', 'Error', 1000)

      // Process skipped steps
      scheduler.processSkippedSteps(steps)

      // Frontend should be skipped
      const state = scheduler.getStepState('frontend-1')
      expect(state?.status).toBe('skipped')
      expect(state?.error).toContain('dependency')
    })

    it('should skip all transitive dependents', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
        { id: 'review-1', agent: 'review', task: 'Review', dependencies: ['frontend-1'] },
      ]

      scheduler.initializeSteps(steps)

      // Fail backend-1
      scheduler.startStep('backend-1')
      scheduler.failStep('backend-1', 'Error', 1000)

      // Process skipped steps
      scheduler.processSkippedSteps(steps)

      // Both frontend and review should be skipped
      expect(scheduler.getStepState('frontend-1')?.status).toBe('skipped')
      expect(scheduler.getStepState('review-1')?.status).toBe('skipped')
    })

    it('should continue with independent steps after failure', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      scheduler.initializeSteps(steps)

      // Fail backend-1
      scheduler.startStep('backend-1')
      scheduler.failStep('backend-1', 'Error', 1000)

      // Process skipped steps
      scheduler.processSkippedSteps(steps)

      // Frontend skipped
      expect(scheduler.getStepState('frontend-1')?.status).toBe('skipped')

      // But research-1 should still be executable
      const executable = scheduler.getExecutableSteps(steps)
      expect(executable.some((s) => s.id === 'research-1')).toBe(true)
    })
  })

  describe('completion detection', () => {
    it('should detect when all steps are complete', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
      ]

      scheduler.initializeSteps(steps)

      expect(scheduler.isComplete(steps)).toBe(false)

      scheduler.startStep('research-1')
      scheduler.completeStep('research-1', 'Done', 1000)

      expect(scheduler.isComplete(steps)).toBe(false)

      scheduler.startStep('backend-1')
      scheduler.completeStep('backend-1', 'Done', 1000)

      expect(scheduler.isComplete(steps)).toBe(true)
    })

    it('should consider skipped steps as terminal', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      scheduler.initializeSteps(steps)

      scheduler.startStep('backend-1')
      scheduler.failStep('backend-1', 'Error', 1000)
      scheduler.processSkippedSteps(steps)

      // Both terminal (error + skipped)
      expect(scheduler.isComplete(steps)).toBe(true)
    })
  })
})
