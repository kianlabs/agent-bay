import { describe, it, expect } from 'vitest'
import {
  normalizePlan,
  validateExecutionPlan,
  hasDependencyCycle,
  getReadySteps,
  hasFailedDependency,
  type ExecutionStep,
  type StepState,
} from '../lib/dependency-graph'

describe('Dependency Graph', () => {
  describe('normalizePlan', () => {
    it('should normalize plan with no dependencies', () => {
      const plan = {
        agents: [
          { agent: 'research' as const, task: 'Research task' },
          { agent: 'backend' as const, task: 'Backend task' },
        ],
      }

      const steps = normalizePlan(plan)

      expect(steps).toHaveLength(2)
      expect(steps[0]).toEqual({
        id: 'research-1',
        agent: 'research',
        task: 'Research task',
        dependencies: [],
      })
      expect(steps[1]).toEqual({
        id: 'backend-1',
        agent: 'backend',
        task: 'Backend task',
        dependencies: ['research-1'],
      })
    })

    it('should normalize plan with dependencies', () => {
      const plan = {
        agents: [
          { agent: 'research' as const, task: 'Research task', dependsOn: [] },
          { agent: 'backend' as const, task: 'Backend task', dependsOn: [] },
          { agent: 'frontend' as const, task: 'Frontend task', dependsOn: ['backend' as const] },
          {
            agent: 'review' as const,
            task: 'Review task',
            dependsOn: ['research' as const, 'backend' as const, 'frontend' as const],
          },
        ],
      }

      const steps = normalizePlan(plan)

      expect(steps).toHaveLength(4)
      expect(steps[0].id).toBe('research-1')
      expect(steps[0].dependencies).toEqual([])

      expect(steps[1].id).toBe('backend-1')
      expect(steps[1].dependencies).toEqual([])

      expect(steps[2].id).toBe('frontend-1')
      expect(steps[2].dependencies).toEqual(['backend-1'])

      expect(steps[3].id).toBe('review-1')
      expect(steps[3].dependencies).toEqual(['research-1', 'backend-1', 'frontend-1'])
    })

    it('should handle multiple steps for same agent', () => {
      const plan = {
        agents: [
          { agent: 'backend' as const, task: 'Backend step 1' },
          { agent: 'backend' as const, task: 'Backend step 2', dependsOn: ['backend' as const] },
        ],
      }

      const steps = normalizePlan(plan)

      expect(steps).toHaveLength(2)
      expect(steps[0].id).toBe('backend-1')
      expect(steps[1].id).toBe('backend-2')
      expect(steps[1].dependencies).toEqual(['backend-1'])
    })

    it('should handle missing dependsOn field (backward compatibility)', () => {
      const plan = {
        agents: [
          { agent: 'research' as const, task: 'Research task' },
          { agent: 'backend' as const, task: 'Backend task' },
        ],
      }

      const steps = normalizePlan(plan)

      // Legacy plan (no dependsOn anywhere): sequential ordering
      expect(steps[0].dependencies).toEqual([])
      expect(steps[1].dependencies).toEqual(['research-1'])
    })

    it('should treat empty dependsOn arrays as new format (parallel)', () => {
      const plan = {
        agents: [
          { agent: 'research' as const, task: 'Research task', dependsOn: [] },
          { agent: 'backend' as const, task: 'Backend task', dependsOn: [] },
        ],
      }

      const steps = normalizePlan(plan)

      // Empty dependsOn arrays = new format = parallel
      expect(steps[0].dependencies).toEqual([])
      expect(steps[1].dependencies).toEqual([])
    })

    it('should preserve sequential order when no dependsOn present (legacy)', () => {
      const plan = {
        agents: [
          { agent: 'backend' as const, task: 'Backend task' },
          { agent: 'frontend' as const, task: 'Frontend task' },
          { agent: 'review' as const, task: 'Review task' },
        ],
      }

      const steps = normalizePlan(plan)

      // Legacy: sequential chain
      expect(steps[0].id).toBe('backend-1')
      expect(steps[0].dependencies).toEqual([])

      expect(steps[1].id).toBe('frontend-1')
      expect(steps[1].dependencies).toEqual(['backend-1'])

      expect(steps[2].id).toBe('review-1')
      expect(steps[2].dependencies).toEqual(['frontend-1'])
    })

    it('should use explicit step IDs when provided', () => {
      const plan = {
        agents: [
          { id: 'research-context', agent: 'research' as const, task: 'Research', dependsOn: [] },
          { id: 'backend-api', agent: 'backend' as const, task: 'Backend', dependsOn: [] },
          { id: 'frontend-ui', agent: 'frontend' as const, task: 'Frontend', dependsOn: ['backend' as const] },
        ],
      }

      const steps = normalizePlan(plan)

      expect(steps[0].id).toBe('research-context')
      expect(steps[1].id).toBe('backend-api')
      expect(steps[2].id).toBe('frontend-ui')
      expect(steps[2].dependencies).toEqual(['backend-api'])
    })

    it('should resolve ambiguous same-agent dependsOn to most recent occurrence', () => {
      const plan = {
        agents: [
          { id: 'backend-api', agent: 'backend' as const, task: 'Backend API', dependsOn: [] },
          { id: 'backend-auth', agent: 'backend' as const, task: 'Backend Auth', dependsOn: [] },
          { id: 'frontend-ui', agent: 'frontend' as const, task: 'Frontend', dependsOn: ['backend' as const] },
        ],
      }

      const steps = normalizePlan(plan)

      // "backend" reference resolves to most recent backend step (backend-auth)
      expect(steps[2].dependencies).toEqual(['backend-auth'])
    })

    it('should normalize new planner format with explicit step-ID dependencies', () => {
      const plan = {
        agents: [
          { id: 'research-context', agent: 'research' as const, task: 'Research', dependsOn: [] },
          { id: 'backend-api', agent: 'backend' as const, task: 'Backend', dependsOn: [] },
          { id: 'frontend-ui', agent: 'frontend' as const, task: 'Frontend', dependsOn: ['backend-api'] },
          { id: 'review-all', agent: 'review' as const, task: 'Review', dependsOn: ['research-context', 'backend-api', 'frontend-ui'] },
        ],
      }

      const steps = normalizePlan(plan)

      expect(steps[0].dependencies).toEqual([])
      expect(steps[1].dependencies).toEqual([])
      expect(steps[2].dependencies).toEqual(['backend-api'])
      expect(steps[3].dependencies).toEqual(['research-context', 'backend-api', 'frontend-ui'])
    })
  })

  describe('validateExecutionPlan', () => {
    it('should validate valid plan', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      const result = validateExecutionPlan(steps)

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect non-existent dependency', () => {
      const steps: ExecutionStep[] = [
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      const result = validateExecutionPlan(steps)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Step frontend-1 depends on non-existent step backend-1')
    })

    it('should detect self-dependency', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: ['backend-1'] },
      ]

      const result = validateExecutionPlan(steps)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Step backend-1 depends on itself')
    })

    it('should detect cycle', () => {
      const steps: ExecutionStep[] = [
        { id: 'a', agent: 'research', task: 'A', dependencies: ['b'] },
        { id: 'b', agent: 'backend', task: 'B', dependencies: ['a'] },
      ]

      const result = validateExecutionPlan(steps)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Dependency cycle detected')
    })
  })

  describe('hasDependencyCycle', () => {
    it('should detect simple cycle', () => {
      const steps: ExecutionStep[] = [
        { id: 'a', agent: 'research', task: 'A', dependencies: ['b'] },
        { id: 'b', agent: 'backend', task: 'B', dependencies: ['a'] },
      ]

      expect(hasDependencyCycle(steps)).toBe(true)
    })

    it('should detect transitive cycle', () => {
      const steps: ExecutionStep[] = [
        { id: 'a', agent: 'research', task: 'A', dependencies: ['b'] },
        { id: 'b', agent: 'backend', task: 'B', dependencies: ['c'] },
        { id: 'c', agent: 'frontend', task: 'C', dependencies: ['a'] },
      ]

      expect(hasDependencyCycle(steps)).toBe(true)
    })

    it('should not detect cycle in valid graph', () => {
      const steps: ExecutionStep[] = [
        { id: 'a', agent: 'research', task: 'A', dependencies: [] },
        { id: 'b', agent: 'backend', task: 'B', dependencies: [] },
        { id: 'c', agent: 'frontend', task: 'C', dependencies: ['a', 'b'] },
      ]

      expect(hasDependencyCycle(steps)).toBe(false)
    })
  })

  describe('getReadySteps', () => {
    it('should return steps with no dependencies', () => {
      const steps: ExecutionStep[] = [
        { id: 'research-1', agent: 'research', task: 'Research', dependencies: [] },
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      const stepStates = new Map<string, StepState>([
        [
          'research-1',
          { step: steps[0], status: 'pending' },
        ],
        [
          'backend-1',
          { step: steps[1], status: 'pending' },
        ],
        [
          'frontend-1',
          { step: steps[2], status: 'pending' },
        ],
      ])

      const ready = getReadySteps(steps, stepStates)

      expect(ready).toHaveLength(2)
      expect(ready.map((s) => s.id)).toEqual(['research-1', 'backend-1'])
    })

    it('should return dependent step after dependency completes', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      const stepStates = new Map<string, StepState>([
        [
          'backend-1',
          { step: steps[0], status: 'completed' },
        ],
        [
          'frontend-1',
          { step: steps[1], status: 'pending' },
        ],
      ])

      const ready = getReadySteps(steps, stepStates)

      expect(ready).toHaveLength(1)
      expect(ready[0].id).toBe('frontend-1')
    })

    it('should not return dependent step if dependency not completed', () => {
      const steps: ExecutionStep[] = [
        { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
        { id: 'frontend-1', agent: 'frontend', task: 'Frontend', dependencies: ['backend-1'] },
      ]

      const stepStates = new Map<string, StepState>([
        [
          'backend-1',
          { step: steps[0], status: 'running' },
        ],
        [
          'frontend-1',
          { step: steps[1], status: 'pending' },
        ],
      ])

      const ready = getReadySteps(steps, stepStates)

      expect(ready).toHaveLength(0)
    })
  })

  describe('hasFailedDependency', () => {
    it('should return true if dependency failed', () => {
      const step: ExecutionStep = {
        id: 'frontend-1',
        agent: 'frontend',
        task: 'Frontend',
        dependencies: ['backend-1'],
      }

      const stepStates = new Map<string, StepState>([
        [
          'backend-1',
          {
            step: { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
            status: 'error',
          },
        ],
      ])

      expect(hasFailedDependency(step, stepStates)).toBe(true)
    })

    it('should return false if no dependencies failed', () => {
      const step: ExecutionStep = {
        id: 'frontend-1',
        agent: 'frontend',
        task: 'Frontend',
        dependencies: ['backend-1'],
      }

      const stepStates = new Map<string, StepState>([
        [
          'backend-1',
          {
            step: { id: 'backend-1', agent: 'backend', task: 'Backend', dependencies: [] },
            status: 'completed',
          },
        ],
      ])

      expect(hasFailedDependency(step, stepStates)).toBe(false)
    })
  })
})
