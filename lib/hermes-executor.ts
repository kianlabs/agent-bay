import { spawn } from 'child_process'
import { createWriteStream, type WriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { finished } from 'stream/promises'
import { join } from 'path'
import {
  AGENT_PROFILES,
  AGENT_TIMEOUTS,
  getTimeoutForAgent,
  HERMES_MODEL_OVERRIDE,
  HermesExecutionResult,
} from './hermes-config'

// Output preview limits (keep in memory)
const STDOUT_PREVIEW_LIMIT = 50 * 1024 // 50KB
const STDERR_PREVIEW_LIMIT = 50 * 1024 // 50KB

// Log directory
const LOGS_DIR = '.hermes-runs'

/**
 * Ensure log directory exists for a task
 */
async function ensureLogDir(taskId: string): Promise<string> {
  const taskDir = join(process.cwd(), LOGS_DIR, `task_${taskId}`)
  await mkdir(taskDir, { recursive: true })
  return taskDir
}

/**
 * Execute Hermes agent with bounded output and log files
 */
export async function executeHermesAgent(
  agentName: string,
  prompt: string,
  taskId?: string,
  timeoutOverride?: number
): Promise<HermesExecutionResult> {
  const profile = AGENT_PROFILES[agentName as keyof typeof AGENT_PROFILES]

  if (!profile) {
    throw new Error(`No profile mapping for agent: ${agentName}`)
  }

  const timeout = timeoutOverride ?? getTimeoutForAgent(agentName)
  const startTime = Date.now()
  const timestamp = Date.now()

  // Prepare log paths if taskId provided
  let logDir: string | undefined
  let stdoutLogPath: string | undefined
  let stderrLogPath: string | undefined
  let stdoutLogStream: WriteStream | undefined
  let stderrLogStream: WriteStream | undefined

  if (taskId) {
    try {
      logDir = await ensureLogDir(taskId)
      stdoutLogPath = join(logDir, `${agentName.toLowerCase()}_${timestamp}.stdout.log`)
      stderrLogPath = join(logDir, `${agentName.toLowerCase()}_${timestamp}.stderr.log`)

      stdoutLogStream = createWriteStream(stdoutLogPath)
      stderrLogStream = createWriteStream(stderrLogPath)

      stdoutLogStream.on('error', (err) => {
        console.error('[Executor] stdout log stream error:', err)
        stdoutLogStream = undefined
      })

      stderrLogStream.on('error', (err) => {
        console.error('[Executor] stderr log stream error:', err)
        stderrLogStream = undefined
      })
    } catch (err) {
      console.error(`[Executor] Failed to create log dir for task ${taskId}:`, err)
      // Continue without logging to disk
    }
  }

  return new Promise((resolve) => {
    let stdoutPreview = ''
    let stderrPreview = ''
    let stdoutTruncated = false
    let stderrTruncated = false
    let timedOut = false
    let processClosed = false

    // Spawn Hermes process.
    // By default each profile uses its own configured model.
    // HERMES_MODEL_OVERRIDE can optionally override the model globally.
    const args = ['-z', prompt]

    if (HERMES_MODEL_OVERRIDE) {
      args.push('--model', HERMES_MODEL_OVERRIDE)
    }

    const child = spawn(profile, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    // Timeout handler
    const timeoutHandle = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')

      setTimeout(() => {
        if (!processClosed) {
          child.kill('SIGKILL')
        }
      }, 5000)
    }, timeout)

    // Capture stdout (bounded preview + full for log)
    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString()
      stdoutLogStream?.write(chunk)

      if (stdoutPreview.length < STDOUT_PREVIEW_LIMIT) {
        const remaining = STDOUT_PREVIEW_LIMIT - stdoutPreview.length
        stdoutPreview += text.substring(0, remaining)
        if (text.length > remaining) {
          stdoutTruncated = true
        }
      } else {
        stdoutTruncated = true
      }
    })

    // Capture stderr (bounded preview + full for log)
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString()
      stderrLogStream?.write(chunk)

      if (stderrPreview.length < STDERR_PREVIEW_LIMIT) {
        const remaining = STDERR_PREVIEW_LIMIT - stderrPreview.length
        stderrPreview += text.substring(0, remaining)
        if (text.length > remaining) {
          stderrTruncated = true
        }
      } else {
        stderrTruncated = true
      }
    })

    // Handle completion
    child.on('close', async (exitCode, signal) => {
      processClosed = true
      clearTimeout(timeoutHandle)

      const durationMs = Date.now() - startTime

      // Flush streamed log output to disk.
      const flushes: Promise<void>[] = []

      if (stdoutLogStream) {
        stdoutLogStream.end()
        flushes.push(finished(stdoutLogStream).then(() => undefined))
      }

      if (stderrLogStream) {
        stderrLogStream.end()
        flushes.push(finished(stderrLogStream).then(() => undefined))
      }

      if (flushes.length > 0) {
        try {
          await Promise.all(flushes)
        } catch (err) {
          console.error('[Executor] Failed to flush Hermes logs:', err)
        }
      }

      resolve({
        success: exitCode === 0 && !timedOut,
        stdout: stdoutPreview.trim(),
        stderr: stderrPreview.trim(),
        exitCode,
        signal,
        timedOut,
        durationMs,
        stdoutTruncated,
        stderrTruncated,
        rawStdoutPath: stdoutLogPath,
        rawStderrPath: stderrLogPath,
      })
    })

    // Handle spawn errors
    child.on('error', (err) => {
      clearTimeout(timeoutHandle)

      stdoutLogStream?.end()
      stderrLogStream?.end()

      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: null,
        signal: null,
        timedOut: false,
        durationMs: Date.now() - startTime,
        stdoutTruncated: false,
        stderrTruncated: false,
      })
    })
  })
}

/**
 * Execute Hermes Main planning phase
 */
export async function executeHermesMainPlanning(
  prompt: string,
  taskId?: string
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
    {
      "id": "stable-unique-id",
      "agent": "research|backend|frontend|review",
      "task": "Specific instruction",
      "dependsOn": []
    }
  ]
}

Rules:
- Only use agents that are needed
- Each agent entry MUST have a stable, unique "id" string (e.g. "research-context", "backend-api", "frontend-ui")
- "dependsOn" MUST be an array of OTHER step "id" strings that this step needs completed first
- Use empty array "dependsOn": [] for steps with no dependencies
- research runs first if needed
- review runs last after implementation agents
- Parallelizable independent steps should have empty dependsOn so they run concurrently
- Keep tasks specific and actionable`

  const result = await executeHermesAgent(
    'Main',
    planningPrompt,
    taskId,
    AGENT_TIMEOUTS.mainPlanning
  )

  if (!result.success || !result.stdout) {
    console.error('[Hermes Main Planning] Failed:', result.stderr || 'No output')
    return null
  }

  // Try to parse JSON
  try {
    let jsonStr = result.stdout.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    const plan = JSON.parse(jsonStr)

    if (!plan.summary || !Array.isArray(plan.agents)) {
      throw new Error('Invalid plan structure')
    }

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
    if (result.stdoutTruncated) {
      console.error('[Hermes Main Planning] Output was truncated, check:', result.rawStdoutPath)
    }
    return null
  }
}

/**
 * Execute Hermes Main evaluation phase
 */
export async function executeHermesMainEvaluation(
  prompt: string,
  plan: any,
  agentResults: Array<{ agent: string; result?: string; error?: string }>,
  taskId?: string
): Promise<{ evaluation: any; raw: string } | null> {
  const resultsText = agentResults
    .map((r) => {
      if (r.error) {
        return `${r.agent}: ERROR - ${r.error}`
      }
      // Limit result preview to 500 chars in evaluation prompt
      const preview = r.result?.substring(0, 500) || 'No output'
      return `${r.agent}: ${preview}${r.result && r.result.length > 500 ? '...' : ''}`
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

  const result = await executeHermesAgent(
    'Main',
    evalPrompt,
    taskId,
    AGENT_TIMEOUTS.mainEvaluation
  )

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
    if (result.stdoutTruncated) {
      console.error('[Hermes Main Eval] Output was truncated, check:', result.rawStdoutPath)
    }
    return null
  }
}
