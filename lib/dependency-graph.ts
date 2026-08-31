/**
 * Dependency Graph Utilities
 *
 * Validates execution plans and provides dependency-aware scheduling.
 *
 * Legacy plan compatibility:
 * - Plans with explicit dependsOn: use DAG parallel behavior
 * - Plans with NO dependsOn metadata: preserve original sequential ordering
 *   (missing dependsOn != empty dependsOn)
 */

import type { ValidAgentName } from './hermes-config'

/**
 * Normalized execution step with stable ID and dependencies
 */
export interface ExecutionStep {
  id: string
  agent: ValidAgentName
  task: string
  dependencies: string[] // Step IDs this step depends on
}

/**
 * Step execution status
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped'

/**
 * Step state during execution
 */
export interface StepState {
  step: ExecutionStep
  status: StepStatus
  result?: string
  error?: string
  durationMs?: number
  startedAt?: Date
  completedAt?: Date
}

/**
 * Validation result for execution plan
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Normalize plan from Hermes Main format to stable step IDs
 *
 * Legacy compatibility policy:
 * - If ANY agent has explicit dependsOn (even []): resolve agent-name references to step IDs
 * - If NO agent has dependsOn (all undefined): treat as legacy sequential plan
 *   and add edges to preserve original ordering
 *
 * This prevents silently changing legacy plan semantics from sequential to parallel.
 */
export function normalizePlan(plan: {
  agents: Array<{
    agent: ValidAgentName
    task: string
    dependsOn?: string[]
    id?: string
  }>
}): ExecutionStep[] {
  const steps: ExecutionStep[] = []
  const agentCounter: Record<string, number> = {}
  const agentLastStep: Record<string, string> = {}

  // Check if any agent has explicit dependsOn metadata
  const hasExplicitDependencies = plan.agents.some(
    (a) => a.dependsOn !== undefined
  )

  for (const step of plan.agents) {
    // Use explicit ID if provided, otherwise generate stable agent-N
    let stepId: string
    if (step.id) {
      stepId = step.id
    } else {
      const count = (agentCounter[step.agent] || 0) + 1
      agentCounter[step.agent] = count
      stepId = `${step.agent}-${count}`
    }

    let dependencies: string[] = []

    if (hasExplicitDependencies) {
      // New format: dependsOn may reference step IDs or legacy agent names
      if (step.dependsOn && Array.isArray(step.dependsOn)) {
        for (const depRef of step.dependsOn) {
          // Prefer exact step ID reference
          if (steps.some((s) => s.id === depRef)) {
            dependencies.push(depRef)
            continue
          }
          // Fallback: resolve agent-name reference to most recent step for that agent
          const depStepId = agentLastStep[depRef as ValidAgentName]
          if (depStepId) {
            dependencies.push(depStepId)
          }
        }
      }
    } else {
      // Legacy format: no dependsOn anywhere, preserve sequential ordering
      // Each step depends on the previous step (by position in plan)
      if (steps.length > 0) {
        dependencies = [steps[steps.length - 1].id]
      }
    }

    steps.push({
      id: stepId,
      agent: step.agent,
      task: step.task,
      dependencies,
    })

    agentLastStep[step.agent] = stepId
  }

  return steps
}

/**
 * Validate execution plan for correctness
 */
export function validateExecutionPlan(steps: ExecutionStep[]): ValidationResult {
  const errors: string[] = []
  const stepIds = new Set(steps.map((s) => s.id))

  // Check unique IDs
  if (stepIds.size !== steps.length) {
    errors.push('Duplicate step IDs found')
  }

  // Check dependencies exist and no self-dependency
  for (const step of steps) {
    for (const depId of step.dependencies) {
      if (depId === step.id) {
        errors.push(`Step ${step.id} depends on itself`)
      }
      if (!stepIds.has(depId)) {
        errors.push(`Step ${step.id} depends on non-existent step ${depId}`)
      }
    }
  }

  // Check for cycles
  if (hasDependencyCycle(steps)) {
    errors.push('Dependency cycle detected')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Detect if there's a cycle in the dependency graph using DFS
 */
export function hasDependencyCycle(steps: ExecutionStep[]): boolean {
  const stepMap = new Map(steps.map((s) => [s.id, s]))
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function dfs(stepId: string): boolean {
    visited.add(stepId)
    recStack.add(stepId)

    const step = stepMap.get(stepId)
    if (!step) return false

    for (const depId of step.dependencies) {
      if (!visited.has(depId)) {
        if (dfs(depId)) return true
      } else if (recStack.has(depId)) {
        return true // Cycle found
      }
    }

    recStack.delete(stepId)
    return false
  }

  for (const step of steps) {
    if (!visited.has(step.id)) {
      if (dfs(step.id)) return true
    }
  }

  return false
}

/**
 * Get steps that are ready to execute (all dependencies completed)
 */
export function getReadySteps(
  steps: ExecutionStep[],
  stepStates: Map<string, StepState>
): ExecutionStep[] {
  const ready: ExecutionStep[] = []

  for (const step of steps) {
    const state = stepStates.get(step.id)
    if (!state || state.status !== 'pending') {
      continue
    }

    // Check if all dependencies are completed
    const allDepsCompleted = step.dependencies.every((depId) => {
      const depState = stepStates.get(depId)
      return depState && depState.status === 'completed'
    })

    if (allDepsCompleted) {
      ready.push(step)
    }
  }

  return ready
}

/**
 * Check if any dependency of a step has failed
 */
export function hasFailedDependency(
  step: ExecutionStep,
  stepStates: Map<string, StepState>
): boolean {
  return step.dependencies.some((depId) => {
    const depState = stepStates.get(depId)
    return depState && depState.status === 'error'
  })
}

/**
 * Get all steps grouped by agent (for same-agent serialization)
 */
export function groupStepsByAgent(steps: ExecutionStep[]): Map<ValidAgentName, ExecutionStep[]> {
  const grouped = new Map<ValidAgentName, ExecutionStep[]>()

  for (const step of steps) {
    if (!grouped.has(step.agent)) {
      grouped.set(step.agent, [])
    }
    grouped.get(step.agent)!.push(step)
  }

  return grouped
}
