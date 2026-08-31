import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { trackAgentForTask, getAgentsForTask, clearAgentsForTask, getTrackedTasks } from '../lib/task-agent-tracking'

describe('Task-Agent Tracking', () => {
  beforeEach(() => {
    // Clear all tracking before each test
    for (const taskId of getTrackedTasks()) {
      clearAgentsForTask(taskId)
    }
  })

  afterEach(() => {
    // Clean up after tests
    for (const taskId of getTrackedTasks()) {
      clearAgentsForTask(taskId)
    }
  })

  describe('Agent Registration', () => {
    it('should track agents for a task', () => {
      const taskId = 'test-task-1'
      const agentId1 = 'agent-1'
      const agentId2 = 'agent-2'

      trackAgentForTask(taskId, agentId1)
      trackAgentForTask(taskId, agentId2)

      const agents = getAgentsForTask(taskId)
      expect(agents).toContain(agentId1)
      expect(agents).toContain(agentId2)
      expect(agents.length).toBe(2)
    })

    it('should handle multiple tasks independently', () => {
      trackAgentForTask('task-A', 'agent-1')
      trackAgentForTask('task-A', 'agent-2')
      trackAgentForTask('task-B', 'agent-3')

      const agentsA = getAgentsForTask('task-A')
      const agentsB = getAgentsForTask('task-B')

      expect(agentsA).toEqual(['agent-1', 'agent-2'])
      expect(agentsB).toEqual(['agent-3'])
    })

    it('should not duplicate agent IDs', () => {
      const taskId = 'test-task'
      const agentId = 'agent-1'

      trackAgentForTask(taskId, agentId)
      trackAgentForTask(taskId, agentId) // Duplicate
      trackAgentForTask(taskId, agentId) // Duplicate

      const agents = getAgentsForTask(taskId)
      expect(agents.length).toBe(1)
      expect(agents[0]).toBe(agentId)
    })
  })

  describe('Agent Retrieval', () => {
    it('should return empty array for unknown task', () => {
      const agents = getAgentsForTask('unknown-task')
      expect(agents).toEqual([])
    })

    it('should return all tracked agents', () => {
      trackAgentForTask('task-1', 'agent-A')
      trackAgentForTask('task-1', 'agent-B')
      trackAgentForTask('task-1', 'agent-C')

      const agents = getAgentsForTask('task-1')
      expect(agents.length).toBe(3)
    })
  })

  describe('Cleanup', () => {
    it('should clear agents for a task', () => {
      const taskId = 'test-task'
      trackAgentForTask(taskId, 'agent-1')
      trackAgentForTask(taskId, 'agent-2')

      expect(getAgentsForTask(taskId).length).toBe(2)

      clearAgentsForTask(taskId)

      expect(getAgentsForTask(taskId).length).toBe(0)
    })

    it('should not affect other tasks when clearing', () => {
      trackAgentForTask('task-A', 'agent-1')
      trackAgentForTask('task-B', 'agent-2')

      clearAgentsForTask('task-A')

      expect(getAgentsForTask('task-A').length).toBe(0)
      expect(getAgentsForTask('task-B').length).toBe(1)
    })

    it('should handle clearing non-existent task safely', () => {
      expect(() => clearAgentsForTask('non-existent')).not.toThrow()
    })
  })

  describe('Scoped Cleanup Scenario', () => {
    it('should only cleanup agents for failed task', () => {
      // Simulate: Task A and Task B both active
      trackAgentForTask('task-A', 'agent-1')
      trackAgentForTask('task-A', 'agent-2')
      trackAgentForTask('task-B', 'agent-3')
      trackAgentForTask('task-B', 'agent-4')

      // Task A fails
      const failedAgents = getAgentsForTask('task-A')
      expect(failedAgents).toEqual(['agent-1', 'agent-2'])

      clearAgentsForTask('task-A')

      // Task B agents still tracked
      const activeAgents = getAgentsForTask('task-B')
      expect(activeAgents).toEqual(['agent-3', 'agent-4'])
    })
  })

  describe('Tracked Tasks', () => {
    it('should list all tracked task IDs', () => {
      trackAgentForTask('task-1', 'agent-A')
      trackAgentForTask('task-2', 'agent-B')
      trackAgentForTask('task-3', 'agent-C')

      const tasks = getTrackedTasks()
      expect(tasks).toContain('task-1')
      expect(tasks).toContain('task-2')
      expect(tasks).toContain('task-3')
      expect(tasks.length).toBe(3)
    })

    it('should update after clearing tasks', () => {
      trackAgentForTask('task-1', 'agent-A')
      trackAgentForTask('task-2', 'agent-B')

      expect(getTrackedTasks().length).toBe(2)

      clearAgentsForTask('task-1')

      const remaining = getTrackedTasks()
      expect(remaining.length).toBe(1)
      expect(remaining).toContain('task-2')
      expect(remaining).not.toContain('task-1')
    })
  })
})
