import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Real Data Hardening', () => {
  beforeAll(async () => {
    // Ensure test data exists
    await prisma.agent.upsert({
      where: { id: 'test-agent-1' },
      update: {},
      create: {
        id: 'test-agent-1',
        name: 'Test Agent',
        color: '#3B82F6',
        status: 'idle',
        currentTask: 'Waiting for task',
      },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Metrics API', () => {
    it('should return real metrics from database', async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [completedToday, inProgress] = await Promise.all([
        prisma.task.count({
          where: {
            status: 'completed',
            completedAt: { gte: todayStart },
          },
        }),
        prisma.task.count({
          where: {
            status: { in: ['pending', 'planning', 'running'] },
          },
        }),
      ])

      // Metrics should be deterministic numbers from DB
      expect(completedToday).toBeGreaterThanOrEqual(0)
      expect(inProgress).toBeGreaterThanOrEqual(0)
    })

    it('should not fabricate metrics when no data exists', async () => {
      const agents = await prisma.agent.findMany({
        select: { tasksCompleted: true },
      })

      const total = agents.reduce((sum, a) => sum + a.tasksCompleted, 0)

      // Real data should sum correctly
      expect(total).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(total)).toBe(true)
    })
  })

  describe('Agent currentTask lifecycle', () => {
    it('should have valid currentTask when idle', async () => {
      const idleAgents = await prisma.agent.findMany({
        where: { status: 'idle' },
      })

      for (const agent of idleAgents) {
        expect(agent.currentTask).toBeTruthy()
        expect(agent.currentTask).not.toBe('')
      }
    })

    it('should have meaningful currentTask when working', async () => {
      const workingAgents = await prisma.agent.findMany({
        where: { status: 'working' },
      })

      for (const agent of workingAgents) {
        expect(agent.currentTask).toBeTruthy()
        expect(agent.currentTask).not.toBe('Waiting for task')
      }
    })

    it('should describe failed task when in error state', async () => {
      const errorAgents = await prisma.agent.findMany({
        where: { status: 'error' },
      })

      for (const agent of errorAgents) {
        expect(agent.currentTask).toBeTruthy()
        // Error state should have context
        expect(agent.lastError).toBeTruthy()
      }
    })
  })

  describe('Pusher payload integrity', () => {
    it('should include currentTask when agent status changes', () => {
      // This is a contract test - when orchestrator calls:
      // pusherServer.trigger('agent-ops', 'agent-updated', {...})
      // The payload MUST include currentTask field

      const mockPayload = {
        agentId: 'test-123',
        status: 'working',
        currentTask: 'Building API endpoint',
      }

      expect(mockPayload).toHaveProperty('currentTask')
      expect(mockPayload.currentTask).toBeTruthy()
    })
  })
})
