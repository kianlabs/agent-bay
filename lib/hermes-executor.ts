import { spawn } from 'child_process'
import {
  AGENT_PROFILES,
  getTimeoutForAgent,
  HermesExecutionResult,
} from './hermes-config'

/**
 * Execute Hermes agent with one-shot prompt using spawn (safer than exec)
 * Returns structured execution result
 */
export async function executeHermesAgent(
  agentName: string,
  prompt: string
): Promise<HermesExecutionResult> {
  const profile = AGENT_PROFILES[agentName as keyof typeof AGENT_PROFILES]

  if (!profile) {
    throw new Error(`No profile mapping for agent: ${agentName}`)
  }

  const timeout = getTimeoutForAgent(agentName)
  const startTime = Date.now()

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false

    // Spawn Hermes process
    const child = spawn(profile, ['-z', prompt, '--model', 'kr/auto'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
    })

    // Timeout handler
    const timeoutHandle = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')

      // Force kill after 5s if SIGTERM doesn't work
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL')
        }
      }, 5000)
    }, timeout)

    // Capture stdout
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    // Capture stderr
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    // Handle completion
    child.on('close', (exitCode, signal) => {
      clearTimeout(timeoutHandle)

      const durationMs = Date.now() - startTime

      resolve({
        success: exitCode === 0 && !timedOut,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        signal,
        timedOut,
        durationMs,
      })
    })

    // Handle spawn errors (e.g., command not found)
    child.on('error', (err) => {
      clearTimeout(timeoutHandle)

      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: null,
        signal: null,
        timedOut: false,
        durationMs: Date.now() - startTime,
      })
    })
  })
}

/**
 * Execute Hermes Main planning phase
 * Returns parsed HermesPlan or null on failure
 */
export async function executeHermesMainPlanning(
  prompt: string
): Promise<{ plan: any; raw: string } | null> {
  const planningPrompt = `You are Hermes Main, the orchestrator. Given this user request, create a STRICT JSON execution plan.

User request: "${prompt}"

Available agents:
- research: analyze requirements, documentation, architecture
- backend: API endpoints, database, server logic
- frontend: UI components, styling, user interactions
- review: code review, testing, quality assurance

Output ONLY valid JSON with this structure (no markdown, no explanation):
{
  "summary": "Brief task summary",
  "agents": [
    {"agent": "research|backend|frontend|review", "task": "Specific instruction", "dependsOn": []}
  ]
}

Rules:
- Only use agents that are needed
- dependsOn references previous agent names in the plan
- research runs first if needed
- review runs last after implementation agents
- Keep tasks specific and actionable`

  const result = await executeHermesAgent('Main', planningPrompt)

  if (!result.success || !result.stdout) {
    console.error('[Hermes Main Planning] Failed:', result.stderr || 'No output')
    return null
  }

  // Try to parse JSON
  try {
    // Strip markdown fences if present
    let jsonStr = result.stdout.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    const plan = JSON.parse(jsonStr)

    // Validate structure
    if (!plan.summary || !Array.isArray(plan.agents)) {
      throw new Error('Invalid plan structure')
    }

    // Validate agent names
    const validAgents = ['research', 'backend', 'frontend', 'review']
    for (const step of plan.agents) {
      if (!validAgents.includes(step.agent)) {
        throw new Error(`Invalid agent name: ${step.agent}`)
      }
    }

    return { plan, raw: result.stdout }
  } catch (err) {
    console.error('[Hermes Main Planning] JSON parse failed:', err)
    console.error('[Hermes Main Planning] Raw output:', result.stdout)
    return null
  }
}

/**
 * Execute Hermes Main evaluation phase
 */
export async function executeHermesMainEvaluation(
  prompt: string,
  plan: any,
  agentResults: Array<{ agent: string; result?: string; error?: string }>
): Promise<{ evaluation: any; raw: string } | null> {
  const resultsText = agentResults
    .map((r) => {
      if (r.error) {
        return `${r.agent}: ERROR - ${r.error}`
      }
      return `${r.agent}: ${r.result?.substring(0, 500) || 'No output'}`
    })
    .join('\n\n')

  const evalPrompt = `You are Hermes Main. Evaluate whether the task was completed successfully.

Original request: "${prompt}"

Plan executed:
${JSON.stringify(plan, null, 2)}

Agent results:
${resultsText}

Output ONLY valid JSON (no markdown, no explanation):
{
  "status": "completed" | "failed" | "needs_revision",
  "summary": "Brief evaluation summary",
  "result": "Final result description or next steps",
  "issues": ["issue1", "issue2"]
}

Rules:
- status=completed if task is done successfully
- status=failed if critical errors occurred
- status=needs_revision if output exists but needs improvement
- result should contain the actual deliverable or clear next steps
- issues should list any problems found`

  const result = await executeHermesAgent('Main', evalPrompt)

  if (!result.success || !result.stdout) {
    console.error('[Hermes Main Eval] Failed:', result.stderr || 'No output')
    return null
  }

  try {
    let jsonStr = result.stdout.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    const evaluation = JSON.parse(jsonStr)

    if (!evaluation.status || !evaluation.summary) {
      throw new Error('Invalid evaluation structure')
    }

    return { evaluation, raw: result.stdout }
  } catch (err) {
    console.error('[Hermes Main Eval] JSON parse failed:', err)
    console.error('[Hermes Main Eval] Raw output:', result.stdout)
    return null
  }
}
