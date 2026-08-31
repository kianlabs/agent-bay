import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher-server'

// Simulator - change random developer agent status
export async function GET() {
  try {
    const agents = await prisma.agent.findMany()
    
    if (agents.length === 0) {
      return NextResponse.json({ message: 'No agents to simulate' })
    }

    // Pick random agent
    const randomAgent = agents[Math.floor(Math.random() * agents.length)]
    
    // Tasks by role
    const tasksByRole: Record<string, string[]> = {
      Researcher: [
        'membaca dokumentasi Auth0',
        'menganalisis arsitektur microservices',
        'riset best practice caching Redis',
        'membaca spesifikasi API GraphQL',
        'evaluasi library state management',
      ],
      Frontend: [
        'menulis komponen Login dengan validation',
        'styling form register dengan Tailwind',
        'implementasi dark mode toggle',
        'refactor Dashboard layout',
        'membuat komponen Navbar responsive',
      ],
      Backend: [
        'menulis endpoint /api/auth dengan JWT',
        'refactor middleware authentication',
        'optimasi query database dengan index',
        'implementasi rate limiting',
        'menulis migrasi database users',
      ],
      Review: [
        'review PR #42 - Auth middleware',
        'mengecek PR #38 - Dashboard UI',
        'approve PR #51 - API optimization',
        'review kode komponen Button',
        'testing manual flow registration',
      ],
    }

    const statuses = ['working', 'idle', 'error']
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)]
    
    const tasksForRole = tasksByRole[randomAgent.name] || ['working on tasks...']
    const newTask = tasksForRole[Math.floor(Math.random() * tasksForRole.length)]
    
    const taskDelta = Math.random() < 0.3 ? 1 : 0 // 30% chance complete task
    const queueDelta = Math.random() < 0.2 ? Math.floor(Math.random() * 3) - 1 : 0

    // Set error details if status becomes 'error'
    const errorData = newStatus === 'error' ? {
      lastError: `Failed to ${newTask.toLowerCase()}`,
      errorDetails: `Error occurred at ${new Date().toISOString()}\nStack trace:\n  at processTask()\n  at executeAgent()`,
      errorTimestamp: new Date(),
    } : {
      lastError: null,
      errorDetails: null,
      errorTimestamp: null,
    }

    // Update agent
    const updated = await prisma.agent.update({
      where: { id: randomAgent.id },
      data: {
        status: newStatus,
        currentTask: newTask,
        tasksCompleted: randomAgent.tasksCompleted + taskDelta,
        tasksInQueue: Math.max(0, randomAgent.tasksInQueue + queueDelta),
        ...errorData,
      },
    })

    // Trigger Pusher event
    await pusherServer.trigger('agent-ops', 'agent-updated', {
      agentId: updated.id,
      status: updated.status,
      currentTask: updated.currentTask,
      tasksCompleted: updated.tasksCompleted,
      tasksInQueue: updated.tasksInQueue,
    })

    // Random speech bubble (25% chance)
    if (Math.random() < 0.25) {
      const messagesByRole: Record<string, string[]> = {
        Researcher: ['interesting! 🤔', 'dokumentasi lengkap ✓', 'noted!'],
        Frontend: ['styling done! ✨', 'UI looks good 👍', 'responsive ✓'],
        Backend: ['endpoint ready ✓', 'optimized! 🚀', 'migration done'],
        Review: ['PR approved ✓', 'looks good! 👍', 'LGTM ✅'],
      }
      
      const messagesForRole = messagesByRole[updated.name] || ['working...']
      const message = messagesForRole[Math.floor(Math.random() * messagesForRole.length)]
      
      await prisma.event.create({
        data: {
          agentId: updated.id,
          message,
        },
      })

      await pusherServer.trigger('agent-ops', 'new-message', {
        agentId: updated.id,
        message,
        timestamp: new Date(),
      })
    }

    // Update metrics (20% chance)
    if (Math.random() < 0.2) {
      const metrics = await prisma.metrics.findFirst()
      if (metrics) {
        const buildPassing = Math.random() > 0.1 // 90% pass rate
        const testDelta = Math.floor(Math.random() * 5)
        
        const updatedMetrics = await prisma.metrics.update({
          where: { id: metrics.id },
          data: {
            tasksCompletedToday: metrics.tasksCompletedToday + taskDelta,
            tasksInProgress: Math.max(1, metrics.tasksInProgress + queueDelta),
            prsReviewed: metrics.prsReviewed + (Math.random() < 0.15 ? 1 : 0),
            buildStatus: buildPassing ? 'passing' : 'failing',
            lastBuildTime: 'just now',
            testsPassed: metrics.testsPassed + testDelta,
            testsFailed: buildPassing ? metrics.testsFailed : metrics.testsFailed + 1,
          },
        })

        await pusherServer.trigger('agent-ops', 'metrics-updated', updatedMetrics)
      }
    }

    return NextResponse.json({ 
      updated,
      message: `Simulated: ${updated.name} → ${updated.status}` 
    })
  } catch (error) {
    console.error('Error in simulator:', error)
    return NextResponse.json(
      { error: 'Simulation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
