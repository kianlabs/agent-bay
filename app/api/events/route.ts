import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { triggerPusherEvent } from '@/lib/pusher-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentId, message } = body

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'agentId is required and must be a string' }, { status: 400 })
    }
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required and must be a string' }, { status: 400 })
    }

    const event = await prisma.event.create({
      data: {
        agentId,
        message,
        timestamp: new Date(),
      },
      include: {
        agent: true,
      },
    })

    // Trigger Pusher event for speech bubble
    await triggerPusherEvent('new-message', {
      agentId: event.agentId,
      message: event.message,
      timestamp: event.timestamp,
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
