import { prisma } from './prisma'
import { pusherServer } from './pusher-server'
import {
  executeHermesAgent,
  executeHermesMainPlanning,
  executeHermesMainEvaluation,
} from './hermes-executor'
import { MAX_CONCURRENT_WORKERS } from './hermes-config'
import { routeTask } from './hermes-runner'
import { tryAcquireLock, releaseLock, isLocked } from './execution-lock'
import { trackAgentForTask, getAgentsForTask, clearAgentsForTask, isAgentUsedByOtherActiveTask } from './task-agent-tracking'
import { normalizePlan, validateExecutionPlan, type ExecutionStep } from './dependency-graph'
import { ParallelScheduler } from './parallel-scheduler'
import { executeStepsInParallel } from './parallel-execution'

// Legacy runningWorkers counter removed - concurrency now managed by worker-execution-coordinator

// Agent name mapping: plan uses lowercase, DB uses capitalized
const AGENT_NAME_MAP: Record<string, string> = {
  research: 'Researcher',
  backend: 'Backend',
  frontend: 'Frontend',
  review: 'Review',
}

/**
 * Orchestrate full task execution (public API)
 * Acquires execution lock and delegates to internal implementation
 */
export async function orchestrateTask(taskId: string, prompt: string) {
  // Try to acquire execution lock
  if (!tryAcquireLock(taskId)) {
    console.log(`[Orchestrator] Task ${taskId} already active, skipping duplicate execution`)
    return
  }

  try {
    await runOrchestrationLocked(taskId, prompt)
  } finally {
    // Always clear tracking and release lock (even on success or error)
    clearAgentsForTask(taskId)
    releaseLock(taskId)
  }
}

/**
 * Internal orchestration implementation
 * ASSUMES: execution lock already acquired by caller
 * 
 * Full task execution:
 * 1. Hermes Main planning
 * 2. Execute selected agents (with dependency handling)
 * 3. Hermes Main evaluation
 * 
 * EXPORTED for recovery system use only - do not call directly from routes
 */
export async function runOrchestrationLocked(taskId: string, prompt: string) {
  try {
    console.log(`[Orchestrator] Starting task ${taskId}`)

    // Update task status to 'planning'
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'planning',
        startedAt: new Date(),
      },
    })

    // === PHASE 1: HERMES MAIN PLANNING ===
    console.log('[Orchestrator] Phase 1: Planning')

    // Track Hermes Main for this task
    const hermesMainAgent = await prisma.agent.findFirst({
      where: { name: 'Hermes Main' },
    })
    if (hermesMainAgent) {
      trackAgentForTask(taskId, hermesMainAgent.id)
    }

    // Hermes Main must be marked working BEFORE the real Hermes process starts.
    const mainAgentBeforePlanning = await prisma.agent.findFirst({
      where: { name: 'Hermes Main' },
    })

    if (mainAgentBeforePlanning) {
      await prisma.agent.update({
        where: { id: mainAgentBeforePlanning.id },
        data: {
          status: 'working',
          currentTask: 'Analyzing task',
          lastError: null,
          errorDetails: null,
          errorTimestamp: null,
        },
      })

      await pusherServer.trigger('agent-ops', 'agent-updated', {
        agentId: mainAgentBeforePlanning.id,
        status: 'working',
        currentTask: 'Analyzing task',
      })

      await prisma.activity.create({
        data: {
          agentId: mainAgentBeforePlanning.id,
          agentName: 'Hermes Main',
          action: 'analyzing prompt',
          type: 'task-completed',
        },
      })
    }

    const planResult = await executeHermesMainPlanning(prompt, taskId)

    if (!planResult) {
      if (mainAgentBeforePlanning) {
        await prisma.agent.update({
          where: { id: mainAgentBeforePlanning.id },
          data: {
            status: 'error',
            currentTask: 'Planning failed',
            lastError: 'Hermes Main planning failed',
            errorTimestamp: new Date(),
          },
        })

        await pusherServer.trigger('agent-ops', 'agent-updated', {
          agentId: mainAgentBeforePlanning.id,
          status: 'error',
          currentTask: 'Planning failed',
        })
      }

      console.log('[Orchestrator] Planning failed, falling back to keyword routing')
      await fallbackToKeywordRouting(taskId, prompt)
      return
    }

    const { plan } = planResult
    console.log('[Orchestrator] Plan created:', JSON.stringify(plan, null, 2))

    // Save plan to DB
    await prisma.task.update({
      where: { id: taskId },
      data: {
        plan: JSON.stringify(plan),
        status: 'running',
      },
    })

    // Create activity for planning
    const mainAgentPlanning = await prisma.agent.findFirst({
      where: { name: 'Hermes Main' },
    })

    if (mainAgentPlanning) {
      await prisma.activity.create({
        data: {
          agentId: mainAgentPlanning.id,
          agentName: 'Hermes Main',
          action: `created execution plan: ${plan.summary}`,
          type: 'task-completed',
        },
      })

      // Set back to idle after planning
      await prisma.agent.update({
        where: { id: mainAgentPlanning.id },
        data: {
          status: 'idle',
          currentTask: 'Waiting for task',
        },
      })

      await pusherServer.trigger('agent-ops', 'agent-updated', {
        agentId: mainAgentPlanning.id,
        status: 'idle',
      })
    } else {
      console.warn('[Orchestrator] Hermes Main agent not found in DB')
    }

    // === PHASE 2: EXECUTE AGENTS ===
    console.log('[Orchestrator] Phase 2: Executing agents (parallel with dependencies)')
    
    // Normalize plan to execution steps with stable IDs
    const steps = normalizePlan(plan)
    
    // Validate dependency graph
    const validation = validateExecutionPlan(steps)
    if (!validation.valid) {
      console.error('[Orchestrator] Invalid execution plan:', validation.errors)
      
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'error',
          error: `Invalid execution plan: ${validation.errors.join(', ')}`,
          completedAt: new Date(),
        },
      })
      
      return
    }
    
    // Initialize parallel scheduler
    const scheduler = new ParallelScheduler()
    scheduler.initializeSteps(steps)
    
    // Execute steps in parallel with dependency awareness
    await executeStepsInParallel(taskId, steps, scheduler)
    
    // Build agentResults from step states for evaluation
    const agentResults: Array<{
      agent: string
      result?: string
      error?: string
      durationMs: number
      truncated?: boolean
      logPath?: string
    }> = []
    
    for (const step of steps) {
      const state = scheduler.getStepState(step.id)
      if (!state) continue
      
      if (state.status === 'completed') {
        agentResults.push({
          agent: step.agent,
          result: state.result || '',
          durationMs: state.durationMs || 0,
        })
      } else if (state.status === 'error') {
        agentResults.push({
          agent: step.agent,
          error: state.error || 'Unknown error',
          durationMs: state.durationMs || 0,
        })
      } else if (state.status === 'skipped') {
        agentResults.push({
          agent: step.agent,
          error: state.error || 'Skipped',
          durationMs: 0,
        })
      }
    }

    // Sequential execution code removed - now using parallel scheduler
    /*
    for (const step of plan.agents) {
      const agentName = AGENT_NAME_MAP[step.agent]
      if (!agentName) {
        console.error(`[Orchestrator] Unknown agent: ${step.agent}`)
        continue
      }

      // Wait for concurrency slot
      while (runningWorkers >= MAX_CONCURRENT_WORKERS) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      runningWorkers++

      try {
        // Find agent in DB
        const agent = await prisma.agent.findFirst({
          where: { name: agentName },
        })

        if (!agent) {
          console.error(`[Orchestrator] Agent ${agentName} not found in DB`)
          agentResults.push({
            agent: step.agent,
            error: `Agent ${agentName} not found`,
            durationMs: 0,
          })
          continue
        }

        // Track this agent for this task
        trackAgentForTask(taskId, agent.id)

        // Update agent status to 'working' with real currentTask
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            status: 'working',
            currentTask: step.task,
            lastError: null,
            errorDetails: null,
            errorTimestamp: null,
          },
        })

        await pusherServer.trigger('agent-ops', 'agent-updated', {
          agentId: agent.id,
          status: 'working',
          currentTask: step.task,
        })

        await prisma.activity.create({
          data: {
            agentId: agent.id,
            agentName,
            action: `started: ${step.task}`,
            type: 'task-completed',
          },
        })

        console.log(`[Orchestrator] Executing ${agentName}: ${step.task}`)

        // Execute agent with taskId for logging
        const result = await executeHermesAgent(agentName, step.task, taskId)

        if (result.success) {
          // Success - reset to idle with waiting state
          await prisma.agent.update({
            where: { id: agent.id },
            data: {
              status: 'idle',
              currentTask: 'Waiting for task',
              tasksCompleted: { increment: 1 },
            },
          })

          await pusherServer.trigger('agent-ops', 'agent-updated', {
            agentId: agent.id,
            status: 'idle',
            currentTask: 'Waiting for task',
          })

          await prisma.activity.create({
            data: {
              agentId: agent.id,
              agentName,
              action: `completed successfully (${Math.round(result.durationMs / 1000)}s)`,
              type: 'task-completed',
            },
          })

          const preview =
            result.stdout.length > 100
              ? result.stdout.substring(0, 97) + '...'
              : result.stdout

          await prisma.event.create({
            data: {
              agentId: agent.id,
              message: `✓ ${preview}`,
            },
          })

          await pusherServer.trigger('agent-ops', 'new-message', {
            agentId: agent.id,
            message: `✓ ${preview}`,
            timestamp: new Date(),
          })

          agentResults.push({
            agent: step.agent,
            result: result.stdout,
            durationMs: result.durationMs,
            truncated: result.stdoutTruncated,
            logPath: result.rawStdoutPath,
          })

          console.log(
            `[Orchestrator] ${agentName} completed in ${result.durationMs}ms`
          )
        } else {
          // Error or timeout - keep task description for context
          const errorMsg = result.timedOut
            ? `Timed out after ${Math.round(result.durationMs / 1000)}s`
            : result.stderr || 'Unknown error'

          await prisma.agent.update({
            where: { id: agent.id },
            data: {
              status: 'error',
              currentTask: `Failed: ${step.task.substring(0, 100)}`,
              lastError: errorMsg.substring(0, 200),
              errorDetails: result.stderr.substring(0, 1000),
              errorTimestamp: new Date(),
            },
          })

          await pusherServer.trigger('agent-ops', 'agent-updated', {
            agentId: agent.id,
            status: 'error',
            currentTask: `Failed: ${step.task.substring(0, 100)}`,
          })

          await prisma.activity.create({
            data: {
              agentId: agent.id,
              agentName,
              action: `error: ${errorMsg.substring(0, 100)}`,
              type: 'error',
            },
          })

          await prisma.errorLog.create({
            data: {
              agentId: agent.id,
              message: errorMsg.substring(0, 500),
              details: result.stderr.substring(0, 2000),
            },
          })

          agentResults.push({
            agent: step.agent,
            error: errorMsg,
            durationMs: result.durationMs,
            truncated: result.stderrTruncated,
            logPath: result.rawStderrPath,
          })

          console.error(`[Orchestrator] ${agentName} failed: ${errorMsg}`)
        }
      } finally {
        runningWorkers--
      }
    }
    */

    // Save agent results
    await prisma.task.update({
      where: { id: taskId },
      data: {
        agentResults: JSON.stringify(agentResults),
      },
    })

    // === PHASE 3: HERMES MAIN EVALUATION ===
    console.log('[Orchestrator] Phase 3: Evaluation')

    // Hermes Main must be marked working BEFORE evaluation starts.
    const mainAgentBeforeEval = await prisma.agent.findFirst({
      where: { name: 'Hermes Main' },
    })

    if (mainAgentBeforeEval) {
      await prisma.agent.update({
        where: { id: mainAgentBeforeEval.id },
        data: {
          status: 'working',
          currentTask: 'Evaluating results',
          lastError: null,
          errorDetails: null,
          errorTimestamp: null,
        },
      })

      await pusherServer.trigger('agent-ops', 'agent-updated', {
        agentId: mainAgentBeforeEval.id,
        status: 'working',
        currentTask: 'Evaluating results',
      })

      await prisma.activity.create({
        data: {
          agentId: mainAgentBeforeEval.id,
          agentName: 'Hermes Main',
          action: 'evaluating agent results',
          type: 'task-completed',
        },
      })
    }

    const evalResult = await executeHermesMainEvaluation(
      prompt,
      plan,
      agentResults,
      taskId
    )

    if (!evalResult) {
      console.error('[Orchestrator] Evaluation failed')

      if (mainAgentBeforeEval) {
        await prisma.agent.update({
          where: { id: mainAgentBeforeEval.id },
          data: {
            status: 'error',
            currentTask: 'Evaluation failed',
            lastError: 'Hermes Main evaluation failed',
            errorTimestamp: new Date(),
          },
        })

        await pusherServer.trigger('agent-ops', 'agent-updated', {
          agentId: mainAgentBeforeEval.id,
          status: 'error',
          currentTask: 'Evaluation failed',
        })
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'error',
          error: 'Evaluation phase failed',
          completedAt: new Date(),
        },
      })
      return
    }

    const { evaluation } = evalResult

    console.log('[Orchestrator] Evaluation:', JSON.stringify(evaluation, null, 2))

    // Update Main agent status for evaluation
    const mainAgentEval = await prisma.agent.findFirst({
      where: { name: 'Hermes Main' },
    })

    if (mainAgentEval) {
      await prisma.activity.create({
        data: {
          agentId: mainAgentEval.id,
          agentName: 'Hermes Main',
          action: `evaluation: ${evaluation.status} - ${evaluation.summary}`,
          type:
            evaluation.status === 'completed' ? 'task-completed' : 'error',
        },
      })

      // Set back to idle
      await prisma.agent.update({
        where: { id: mainAgentEval.id },
        data: {
          status: 'idle',
          currentTask: 'Waiting for task',
          tasksCompleted: { increment: 1 },
        },
      })

      await pusherServer.trigger('agent-ops', 'agent-updated', {
        agentId: mainAgentEval.id,
        status: 'idle',
      })
    } else {
      console.warn('[Orchestrator] Hermes Main agent not found in DB')
    }

    // Update task with final result
    const finalStatus =
      evaluation.status === 'completed' ? 'completed' : 'error'

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: finalStatus,
        result: evaluation.result,
        evaluation: JSON.stringify(evaluation),
        error:
          evaluation.status !== 'completed'
            ? evaluation.issues.join('; ')
            : null,
        completedAt: new Date(),
      },
    })

    console.log(`[Orchestrator] Task ${taskId} completed with status: ${finalStatus}`)
  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error)

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    })

    // Reset any agents stuck in working state for THIS task only
    await resetStaleAgentsForTask(taskId)
  }
}

/**
 * Reset agents that were used by a specific failed task
 * SCOPED cleanup - only resets agents for this task, not all working agents
 * Protects shared agents still used by other active tasks
 */
async function resetStaleAgentsForTask(taskId: string) {
  try {
    const agentIds = getAgentsForTask(taskId)
    
    if (agentIds.length === 0) {
      return
    }
    
    console.log(`[Orchestrator] Resetting ${agentIds.length} agents for failed task ${taskId}`)
    
    for (const agentId of agentIds) {
      // Check if this agent is used by other active tasks
      const hasOtherOwner = isAgentUsedByOtherActiveTask(agentId, taskId, isLocked)
      
      if (hasOtherOwner) {
        console.log(`[Orchestrator] Skipping reset for agent ${agentId} - still used by other active task`)
        continue
      }
      
      // Safe to reset - check current status
      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      if (agent && agent.status === 'working') {
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: 'idle',
            currentTask: 'Waiting for task',
          },
        })
        console.log(`[Orchestrator] Reset agent ${agent.name} to idle (task ${taskId} failed)`)
      }
    }
  } catch (err) {
    console.error('[Orchestrator] Failed to reset stale agents:', err)
  }
}

/**
 * Fallback to old keyword routing when planning fails
 */
async function fallbackToKeywordRouting(taskId: string, prompt: string) {
  console.log('[Orchestrator] Using fallback keyword routing')

  const agentName = routeTask(prompt)

  await prisma.task.update({
    where: { id: taskId },
    data: {
      assignedTo: agentName,
      status: 'running',
    },
  })

  // Activity for fallback routing
  const mainAgentFallback = await prisma.agent.findFirst({
    where: { name: 'Hermes Main' },
  })

  if (mainAgentFallback) {
    await prisma.activity.create({
      data: {
        agentId: mainAgentFallback.id,
        agentName: 'Hermes Main',
        action: `fallback routing: assigned to ${agentName}`,
        type: 'task-completed',
      },
    })
  }

  // Find agent
  const agent = await prisma.agent.findFirst({
    where: { name: agentName },
  })

  if (!agent) {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'error',
        error: `Agent ${agentName} not found`,
        completedAt: new Date(),
      },
    })
    return
  }

  try {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'working' },
    })

    const result = await executeHermesAgent(agentName, prompt, taskId)

    if (result.success) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'idle',
          tasksCompleted: { increment: 1 },
        },
      })

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          result: result.stdout,
          completedAt: new Date(),
        },
      })
    } else {
      const errorMsg = result.timedOut
        ? `Timed out after ${Math.round(result.durationMs / 1000)}s`
        : result.stderr || 'Unknown error'

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'error',
          lastError: errorMsg.substring(0, 200),
        },
      })

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'error',
          error: errorMsg,
          completedAt: new Date(),
        },
      })
    }
  } finally {
    // Agent status restored by the try/catch above
  }
}
