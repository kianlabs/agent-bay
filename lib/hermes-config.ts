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

// Planning schema from Hermes Main
export interface HermesPlan {
  summary: string
  agents: Array<{
    agent: ValidAgentName
    task: string
    dependsOn: ValidAgentName[]
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
