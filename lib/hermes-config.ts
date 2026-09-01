/**
 * Centralized Hermes Agent configuration
 */

// Agent timeout configuration (in milliseconds)
export const AGENT_TIMEOUTS = {
  mainPlanning: parseInt(process.env.HERMES_TIMEOUT_MAIN_PLANNING || '120000', 10),
  research: parseInt(process.env.HERMES_TIMEOUT_RESEARCH || '180000', 10),
  backend: parseInt(process.env.HERMES_TIMEOUT_BACKEND || '300000', 10),
  frontend: parseInt(process.env.HERMES_TIMEOUT_FRONTEND || '300000', 10),
  review: parseInt(process.env.HERMES_TIMEOUT_REVIEW || '300000', 10),
  mainEvaluation: parseInt(process.env.HERMES_TIMEOUT_MAIN_EVAL || '180000', 10),
} as const

// Agent profile mapping
export const AGENT_PROFILES = {
  Main: 'hermes-main',
  Frontend: 'hermes-frontend',
  Backend: 'hermes-backend',
  Researcher: 'hermes-research',
  Review: 'hermes-review',
} as const

// Optional global model override.
// When unset, every Hermes profile uses its own configured model.
export const HERMES_MODEL_OVERRIDE =
  process.env.HERMES_MODEL_OVERRIDE?.trim() || null

// Max concurrent worker executions (Main not counted)
export const MAX_CONCURRENT_WORKERS = parseInt(
  process.env.HERMES_MAX_CONCURRENT || '4',
  10
)

// Get timeout for specific agent role
export function getTimeoutForAgent(agentName: string): number {
  switch (agentName) {
    case 'Main':
      return AGENT_TIMEOUTS.mainPlanning
    case 'Researcher':
      return AGENT_TIMEOUTS.research
    case 'Backend':
      return AGENT_TIMEOUTS.backend
    case 'Frontend':
      return AGENT_TIMEOUTS.frontend
    case 'Review':
      return AGENT_TIMEOUTS.review
    default:
      return AGENT_TIMEOUTS.frontend // Default fallback
  }
}

// Valid agent names for planning
export type ValidAgentName = 'research' | 'backend' | 'frontend' | 'review'

// Logical (planning) agent name -> display name as stored in the Agent DB row
export const AGENT_DISPLAY_NAMES: Record<ValidAgentName, string> = {
  research: 'Researcher',
  backend: 'Backend',
  frontend: 'Frontend',
  review: 'Review',
}

// Display name -> logical (planning) agent name.
// Reverse lookup used where routing produces a display name.
const DISPLAY_TO_LOGICAL: Record<string, ValidAgentName> = {
  Researcher: 'research',
  Backend: 'backend',
  Frontend: 'frontend',
  Review: 'review',
}

/**
 * Resolve a display name (e.g. "Backend") to its logical agent name (e.g. "backend").
 * Returns undefined if the display name is not a core worker.
 */
export function toLogicalAgentName(displayName: string): ValidAgentName | undefined {
  return DISPLAY_TO_LOGICAL[displayName]
}

// Planning schema from Hermes Main
// PRESERVES backward compatibility: legacy plans may omit id / dependsOn entirely.
// New planner output provides stable step IDs and step-ID based dependsOn.
export interface HermesPlan {
  summary: string
  agents: Array<{
    id?: string // stable step ID (new format)
    agent: ValidAgentName
    task: string
    dependsOn?: string[] // step IDs (new) or agent names (legacy)
  }>
}

// Execution result from Hermes agent
export interface HermesExecutionResult {
  success: boolean
  stdout: string // Preview only (bounded)
  stderr: string // Preview only (bounded)
  exitCode: number | null
  signal: NodeJS.Signals | null
  timedOut: boolean
  durationMs: number
  stdoutTruncated: boolean
  stderrTruncated: boolean
  rawStdoutPath?: string
  rawStderrPath?: string
}

// Final evaluation from Hermes Main
export interface HermesEvaluation {
  status: 'completed' | 'failed' | 'needs_revision'
  summary: string
  result: string
  issues: string[]
}
