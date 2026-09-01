import { spawn } from 'child_process'
import { prisma } from './prisma'
import { pusherServer } from './pusher-server'

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
