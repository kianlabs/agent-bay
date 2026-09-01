import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orchestrateTask } from '@/lib/hermes-orchestrator'
import { pusherServer } from '@/lib/pusher-server'

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

    // Create task in database
    const task = await prisma.task.create({
      data: {
        prompt,
        status: 'pending',
      },
    })

    // Execute task in background via orchestrator (don't await)
    orchestrateTask(task.id, prompt)
      .then(async () => {
        await pusherServer.trigger('agent-ops', 'metrics-updated', {})
      })
      .catch(async (err) => {
        console.error(`[API Tasks] Orchestration failed for task ${task.id}:`, err)
        await pusherServer.trigger('agent-ops', 'metrics-updated', {})
      })

    return NextResponse.json({
      task,
      message: 'Task created, Hermes Main will plan execution',
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
