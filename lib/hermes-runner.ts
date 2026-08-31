import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from './prisma'
import { pusherServer } from './pusher-server'

const execAsync = promisify(exec)

// Agent profile mapping
const AGENT_PROFILES: Record<string, string> = {
  'Frontend': 'hermes-frontend',
  'Backend': 'hermes-backend',
  'Researcher': 'hermes-research',
  'Review': 'hermes-review',
}

// Max concurrent executions (prevent overload)
let runningCount = 0
const MAX_CONCURRENT = 4

/**
 * Execute Hermes agent with one-shot prompt
 * Returns: { success: boolean, result?: string, error?: string }
 */
export async function runHermesAgent(
  agentId: string,
  agentName: string,
  prompt: string,
  timeout: number = 120000 // 2 minutes default
): Promise<{ success: boolean; result?: string; error?: string }> {
  const profile = AGENT_PROFILES[agentName]
  
  if (!profile) {
    return { success: false, error: `No profile for agent: ${agentName}` }
  }

  // Check concurrent limit
  if (runningCount >= MAX_CONCURRENT) {
    return { success: false, error: 'Too many concurrent agents running' }
  }

  runningCount++

  try {
    // Update agent status to 'working'
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'working',
        lastError: null,
        errorDetails: null,
        errorTimestamp: null,
      },
    })

    // Trigger Pusher update
    await pusherServer.trigger('agent-ops', 'agent-updated', {
      agentId,
      status: 'working',
    })

    // Log activity
    await prisma.activity.create({
      data: {
        agentId,
        agentName,
        action: 'started working on task',
        type: 'task-completed',
      },
    })

    // Execute Hermes with one-shot mode
    const command = `${profile} -z "${prompt.replace(/"/g, '\\"')}" --model kr/auto`
    
    console.log(`[Hermes Runner] Executing: ${agentName}`)
    console.log(`[Hermes Runner] Prompt: ${prompt.substring(0, 100)}...`)

    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    })

    const result = stdout.trim()

    // Update agent status to 'idle' (success)
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'idle',
        tasksCompleted: { increment: 1 },
      },
    })

    // Trigger Pusher
    await pusherServer.trigger('agent-ops', 'agent-updated', {
      agentId,
      status: 'idle',
    })

    // Log activity
    await prisma.activity.create({
      data: {
        agentId,
        agentName,
        action: 'completed task successfully',
        type: 'task-completed',
      },
    })

    // Create speech bubble with result preview
    const preview = result.length > 100 ? result.substring(0, 97) + '...' : result
    await prisma.event.create({
      data: {
        agentId,
        message: `✓ ${preview}`,
      },
    })

    await pusherServer.trigger('agent-ops', 'new-message', {
      agentId,
      message: `✓ ${preview}`,
      timestamp: new Date(),
    })

    console.log(`[Hermes Runner] ${agentName} completed successfully`)

    return { success: true, result }

  } catch (error: any) {
    console.error(`[Hermes Runner] ${agentName} failed:`, error.message)

    const errorMsg = error.message || 'Unknown error'
    const errorDetails = error.stderr || error.stack || 'No details available'

    // Update agent status to 'error'
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'error',
        lastError: `Failed: ${errorMsg.substring(0, 200)}`,
        errorDetails: errorDetails.substring(0, 1000),
        errorTimestamp: new Date(),
      },
    })

    // Trigger Pusher
    await pusherServer.trigger('agent-ops', 'agent-updated', {
      agentId,
      status: 'error',
    })

    // Log activity
    await prisma.activity.create({
      data: {
        agentId,
        agentName,
        action: 'encountered an error',
        type: 'error',
      },
    })

    // Log error to ErrorLog table
    await prisma.errorLog.create({
      data: {
        agentId,
        message: errorMsg.substring(0, 500),
        details: errorDetails.substring(0, 2000),
        stack: error.stack?.substring(0, 2000),
      },
    })

    return { success: false, error: errorMsg }

  } finally {
    runningCount--
  }
}

/**
 * Route task to appropriate agent based on keywords
 */
export function routeTask(prompt: string): string {
  const lower = prompt.toLowerCase()

  // Frontend keywords
  if (
    lower.includes('ui') ||
    lower.includes('component') ||
    lower.includes('button') ||
    lower.includes('form') ||
    lower.includes('style') ||
    lower.includes('css') ||
    lower.includes('tailwind') ||
    lower.includes('layout') ||
    lower.includes('navbar') ||
    lower.includes('frontend')
  ) {
    return 'Frontend'
  }

  // Backend keywords
  if (
    lower.includes('api') ||
    lower.includes('endpoint') ||
    lower.includes('database') ||
    lower.includes('query') ||
    lower.includes('schema') ||
    lower.includes('migration') ||
    lower.includes('auth') ||
    lower.includes('jwt') ||
    lower.includes('backend') ||
    lower.includes('server')
  ) {
    return 'Backend'
  }

  // Research keywords
  if (
    lower.includes('research') ||
    lower.includes('analyze') ||
    lower.includes('document') ||
    lower.includes('spec') ||
    lower.includes('requirement') ||
    lower.includes('architecture') ||
    lower.includes('design') ||
    lower.includes('best practice')
  ) {
    return 'Researcher'
  }

  // Review keywords
  if (
    lower.includes('review') ||
    lower.includes('test') ||
    lower.includes('check') ||
    lower.includes('verify') ||
    lower.includes('qa') ||
    lower.includes('quality')
  ) {
    return 'Review'
  }

  // Default: Research for ambiguous tasks
  return 'Researcher'
}
