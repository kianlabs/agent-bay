/**
 * Parallel Execution Scheduler
 *
 * Manages step lifecycle and DAG-based readiness for parallel execution.
 *
 * IMPORTANT: This scheduler does NOT manage concurrency limits or agent
 * serialization. Those are GLOBAL concerns handled by worker-execution-coordinator.
 *
 * This scheduler only tracks step states and determines which steps are
 * ready to execute based on dependency completion.
 */

import type { ExecutionStep, StepState, StepStatus } from './dependency-graph'
import { getReadySteps } from './dependency-graph'

/**
 * Scheduler for parallel execution with dependency awareness
 */
export class ParallelScheduler {
  private readonly stepStates: Map<string, StepState>

  constructor() {
    this.stepStates = new Map()
  }

  /**
   * Initialize step states
   */
  initializeSteps(steps: ExecutionStep[]): void {
    for (const step of steps) {
      this.stepStates.set(step.id, {
        step,
        status: 'pending',
      })
    }
  }

  /**
   * Get steps ready to execute (dependencies met).
   * Concurrency and agent availability are managed externally
   * by the worker execution coordinator.
   */
  getExecutableSteps(steps: ExecutionStep[]): ExecutionStep[] {
    return getReadySteps(steps, this.stepStates)
  }

  /**
   * Mark step as running
   */
  startStep(stepId: string): void {
    const state = this.stepStates.get(stepId)
    if (!state) return

    state.status = 'running'
    state.startedAt = new Date()
  }

  /**
   * Mark step as completed
   */
  completeStep(stepId: string, result: string, durationMs: number): void {
    const state = this.stepStates.get(stepId)
    if (!state) return

    state.status = 'completed'
    state.result = result
    state.durationMs = durationMs
    state.completedAt = new Date()
  }

  /**
   * Mark step as failed
   */
  failStep(stepId: string, error: string, durationMs: number): void {
    const state = this.stepStates.get(stepId)
    if (!state) return

    state.status = 'error'
    state.error = error
    state.durationMs = durationMs
    state.completedAt = new Date()
  }

  /**
   * Skip step due to failed dependency
   */
  skipStep(stepId: string, reason: string): void {
    const state = this.stepStates.get(stepId)
    if (!state) return

    state.status = 'skipped'
    state.error = reason
  }

  /**
   * Process steps that should be skipped due to failed dependencies
   * Runs multiple passes to handle transitive skips
   */
  processSkippedSteps(steps: ExecutionStep[]): void {
    let changed = true
    let passes = 0
    const maxPasses = steps.length

    while (changed && passes < maxPasses) {
      changed = false
      passes++

      for (const step of steps) {
        const state = this.stepStates.get(step.id)
        if (!state || state.status !== 'pending') {
          continue
        }

        const blockedDeps = step.dependencies.filter((depId) => {
          const depState = this.stepStates.get(depId)
          return depState && (depState.status === 'error' || depState.status === 'skipped')
        })

        if (blockedDeps.length > 0) {
          this.skipStep(step.id, `Skipped because dependency ${blockedDeps.join(', ')} failed`)
          console.log(`[Scheduler] Skipped ${step.id} due to failed dependencies: ${blockedDeps.join(', ')}`)
          changed = true
        }
      }
    }
  }

  /**
   * Check if all steps are in terminal state
   */
  isComplete(steps: ExecutionStep[]): boolean {
    return steps.every((step) => {
      const state = this.stepStates.get(step.id)
      return state && ['completed', 'error', 'skipped'].includes(state.status)
    })
  }

  /**
   * Get current step states
   */
  getStepStates(): Map<string, StepState> {
    return this.stepStates
  }

  /**
   * Get state for a specific step
   */
  getStepState(stepId: string): StepState | undefined {
    return this.stepStates.get(stepId)
  }
}
