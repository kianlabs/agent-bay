import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runHermesAgent, routeTask } from '@/lib/hermes-runner'

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Route task to appropriate agent
    const assignedTo = routeTask(prompt)

    // Create task in database
    const task = await prisma.task.create({
      data: {
        prompt,
        assignedTo,
        status: 'pending',
      },
    })

    // Find agent by name
    const agent = await prisma.agent.findFirst({
      where: { name: assignedTo },
    })

    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${assignedTo} not found` },
        { status: 404 }
      )
    }

    // Execute task in background (don't await)
    executeTask(task.id, agent.id, agent.name, prompt)

    return NextResponse.json({
      task,
      message: `Task assigned to ${assignedTo}`,
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

// Background task execution
async function executeTask(
  taskId: string,
  agentId: string,
  agentName: string,
  prompt: string
) {
  try {
    // Update task status to 'running'
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    })

    // Run Hermes agent
    const result = await runHermesAgent(agentId, agentName, prompt)

    // Update task with result
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: result.success ? 'completed' : 'error',
        result: result.result,
        error: result.error,
        completedAt: new Date(),
      },
    })

    console.log(`[Task ${taskId}] Completed by ${agentName}`)
  } catch (error) {
    console.error(`[Task ${taskId}] Execution failed:`, error)
    
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    })
  }
}
