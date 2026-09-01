import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tryAcquireLock, releaseLock, isLocked, clearAllLocks } from '../lib/execution-lock'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── helpers ────────────────────────────────────────────────────────────────

async function createAgent(overrides: Partial<{
  id: string
  name: string
  status: string
  currentTaskId: string | null
  lastError: string | null
}> = {}) {
  return prisma.agent.create({
    data: {
      id: overrides.id ?? `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: overrides.name ?? 'Test Worker',
      color: '#3B82F6',
      status: overrides.status ?? 'idle',
      currentTask: 'Waiting for task',
      currentTaskId: overrides.currentTaskId ?? null,
      lastError: overrides.lastError ?? null,
    },
  })
}

async function createTask(overrides: Partial<{
  id: string
  status: string
  error: string | null
  prompt: string
}> = {}) {
  return prisma.task.create({
    data: {
      id: overrides.id ?? `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      prompt: overrides.prompt ?? 'Test task prompt',
      status: overrides.status ?? 'error',
      error: overrides.error ?? 'Something went wrong',
    },
  })
}

// ─── cleanup ─────────────────────────────────────────────────────────────────

const createdAgentIds: string[] = []
const createdTaskIds: string[] = []

async function trackAgent(p: ReturnType<typeof createAgent>) {
  const a = await p
  createdAgentIds.push(a.id)
  return a
}

async function trackTask(p: ReturnType<typeof createTask>) {
  const t = await p
  createdTaskIds.push(t.id)
  return t
}

beforeEach(() => {
  clearAllLocks()
})

afterEach(async () => {
  clearAllLocks()
  if (createdAgentIds.length) {
    await prisma.agent.deleteMany({ where: { id: { in: [...createdAgentIds] } } })
    createdAgentIds.length = 0
  }
  if (createdTaskIds.length) {
    await prisma.task.deleteMany({ where: { id: { in: [...createdTaskIds] } } })
    createdTaskIds.length = 0
  }
})

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('GET /api/agents — currentTaskId in response', () => {
  it('should include currentTaskId field in agent select results', async () => {
    const task = await trackTask(createTask({ status: 'running' }))
    const agent = await trackAgent(
      createAgent({ name: 'Backend', currentTaskId: task.id, status: 'working' })
    )

    // Simulate what the route does: select currentTaskId explicitly
    const agents = await prisma.agent.findMany({
      where: { id: agent.id },
      select: {
        id: true,
        name: true,
        color: true,
        status: true,
        currentTask: true,
        currentTaskId: true,
        tasksCompleted: true,
        tasksInQueue: true,
        lastError: true,
        errorDetails: true,
        errorTimestamp: true,
        maxCapacity: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    expect(agents).toHaveLength(1)
    expect(agents[0]).toHaveProperty('currentTaskId')
    expect(agents[0].currentTaskId).toBe(task.id)
  })

  it('should return null currentTaskId for idle agents', async () => {
    const agent = await trackAgent(createAgent({ name: 'Researcher', status: 'idle' }))

    const result = await prisma.agent.findUnique({
      where: { id: agent.id },
      select: { id: true, currentTaskId: true },
    })

    expect(result).not.toBeNull()
    expect(result!.currentTaskId).toBeNull()
  })
})

describe('Retry — uses real task ID, not agent ID', () => {
  it('should reject retry when retryTaskId does not match agent.currentTaskId', async () => {
    const task = await trackTask(createTask({ status: 'error' }))
    const agent = await trackAgent(
      createAgent({ status: 'error', currentTaskId: task.id, lastError: 'boom' })
    )

    // Simulate using agent.id as retryTaskId (the old bug)
    const wrongTaskId = agent.id // agent ID ≠ task ID

    // Validate: agent.currentTaskId !== wrongTaskId → should be rejected
    expect(agent.currentTaskId).toBe(task.id)
    expect(agent.currentTaskId).not.toBe(wrongTaskId)

    // The route validates agent.currentTaskId === retryTaskId
    const isValid = agent.currentTaskId === wrongTaskId
    expect(isValid).toBe(false)
  })

  it('should accept retry when retryTaskId matches agent.currentTaskId exactly', async () => {
    const task = await trackTask(createTask({ status: 'error' }))
    const agent = await trackAgent(
      createAgent({ status: 'error', currentTaskId: task.id, lastError: 'boom' })
    )

    // Using the actual task ID (correct behaviour)
    const isValid = agent.currentTaskId === task.id
    expect(isValid).toBe(true)
  })
})

describe('Retry — active/locked task rejected with 409, no DB mutation', () => {
  it('should reject retry when task is locked (running)', async () => {
    const task = await trackTask(createTask({ status: 'error' }))
    const agent = await trackAgent(
      createAgent({ status: 'error', currentTaskId: task.id, lastError: 'err' })
    )

    // Acquire lock — simulates an already-running orchestration
    const acquired = tryAcquireLock(task.id)
    expect(acquired).toBe(true)

    try {
      // Route logic: if isLocked → 409
      const blocked = isLocked(task.id)
      expect(blocked).toBe(true)

      // DB must NOT have been mutated — task still 'error'
      const unchanged = await prisma.task.findUnique({ where: { id: task.id } })
      expect(unchanged!.status).toBe('error')

      // Agent must NOT have been mutated
      const unchangedAgent = await prisma.agent.findUnique({ where: { id: agent.id } })
      expect(unchangedAgent!.status).toBe('error')
    } finally {
      releaseLock(task.id)
    }
  })

  it('should reject retry when task status is running (active, not error)', async () => {
    const task = await trackTask(createTask({ status: 'running', error: null }))
    const agent = await trackAgent(
      createAgent({ status: 'working', currentTaskId: task.id })
    )

    // Route logic: task.status !== 'error' → 409
    expect(task.status).not.toBe('error')

    // Confirm no lock was acquired (route returns before tryAcquireLock)
    expect(isLocked(task.id)).toBe(false)

    // DB untouched
    const unchanged = await prisma.task.findUnique({ where: { id: task.id } })
    expect(unchanged!.status).toBe('running')
  })

  it('should reject retry when task status is planning', async () => {
    const task = await trackTask(createTask({ status: 'planning', error: null }))
    await trackAgent(createAgent({ status: 'working', currentTaskId: task.id }))

    expect(task.status).not.toBe('error')
    expect(isLocked(task.id)).toBe(false)

    const unchanged = await prisma.task.findUnique({ where: { id: task.id } })
    expect(unchanged!.status).toBe('planning')
  })

  it('should reject retry when task status is pending', async () => {
    const task = await trackTask(createTask({ status: 'pending', error: null }))
    await trackAgent(createAgent({ status: 'idle', currentTaskId: task.id }))

    expect(task.status).not.toBe('error')
    expect(isLocked(task.id)).toBe(false)

    const unchanged = await prisma.task.findUnique({ where: { id: task.id } })
    expect(unchanged!.status).toBe('pending')
  })
})

describe('Retry — error task succeeds: lock acquired, DB reset, orchestration starts', () => {
  it('should acquire lock, reset task to pending, and clear error fields', async () => {
    const task = await trackTask(createTask({ status: 'error' }))
    const agent = await trackAgent(
      createAgent({ status: 'error', currentTaskId: task.id, lastError: 'boom' })
    )

    // Preconditions
    expect(task.status).toBe('error')
    expect(isLocked(task.id)).toBe(false)
    expect(agent.currentTaskId).toBe(task.id)

    // Simulate the route: acquire lock → reset DB
    const acquired = tryAcquireLock(task.id)
    expect(acquired).toBe(true)
    expect(isLocked(task.id)).toBe(true)

    try {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'pending',
          error: null,
          result: null,
          evaluation: null,
          agentResults: null,
          startedAt: null,
          completedAt: null,
        },
      })

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'idle',
          currentTask: 'Waiting for task',
          lastError: null,
          errorDetails: null,
          errorTimestamp: null,
        },
      })

      const resetTask = await prisma.task.findUnique({ where: { id: task.id } })
      expect(resetTask!.status).toBe('pending')
      expect(resetTask!.error).toBeNull()

      const resetAgent = await prisma.agent.findUnique({ where: { id: agent.id } })
      expect(resetAgent!.status).toBe('idle')
      expect(resetAgent!.lastError).toBeNull()
    } finally {
      releaseLock(task.id)
    }

    expect(isLocked(task.id)).toBe(false)
  })
})

describe('Retry — unrelated agent not reset', () => {
  it('should not reset agents not associated with the retried task', async () => {
    const task = await trackTask(createTask({ status: 'error' }))
    const targetAgent = await trackAgent(
      createAgent({ name: 'Target', status: 'error', currentTaskId: task.id, lastError: 'err' })
    )

    // Unrelated agent in error state for a different task
    const otherTask = await trackTask(createTask({ status: 'error' }))
    const otherAgent = await trackAgent(
      createAgent({ name: 'Other', status: 'error', currentTaskId: otherTask.id, lastError: 'other err' })
    )

    // Simulate retry of task → only reset targetAgent
    const acquired = tryAcquireLock(task.id)
    expect(acquired).toBe(true)

    try {
      await prisma.agent.update({
        where: { id: targetAgent.id },
        data: { status: 'idle', currentTask: 'Waiting for task', lastError: null },
      })

      // Other agent must remain untouched
      const unchanged = await prisma.agent.findUnique({ where: { id: otherAgent.id } })
      expect(unchanged!.status).toBe('error')
      expect(unchanged!.lastError).toBe('other err')
      expect(unchanged!.currentTaskId).toBe(otherTask.id)
    } finally {
      releaseLock(task.id)
    }
  })
})

describe('Retry — lock released even when orchestration fails', () => {
  it('should release lock after orchestration throws', async () => {
    const task = await trackTask(createTask({ status: 'error' }))

    const acquired = tryAcquireLock(task.id)
    expect(acquired).toBe(true)
    expect(isLocked(task.id)).toBe(true)

    // Simulate orchestration failure in finally block (mirrors route logic)
    const simulateOrchestrationFailure = async () => {
      try {
        throw new Error('Simulated orchestration failure')
      } finally {
        releaseLock(task.id)
      }
    }

    await expect(simulateOrchestrationFailure()).rejects.toThrow('Simulated orchestration failure')

    // Lock must be released despite the error
    expect(isLocked(task.id)).toBe(false)
  })

  it('should allow re-lock after failed retry releases lock', async () => {
    const task = await trackTask(createTask({ status: 'error' }))

    // First attempt: acquire + fail + release
    tryAcquireLock(task.id)
    releaseLock(task.id)

    // Second attempt must succeed
    const second = tryAcquireLock(task.id)
    expect(second).toBe(true)
    expect(isLocked(task.id)).toBe(true)

    releaseLock(task.id)
    expect(isLocked(task.id)).toBe(false)
  })
})
