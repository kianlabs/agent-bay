import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawLimit = parseInt(searchParams.get('limit') || '30')
    const limit = isNaN(rawLimit) ? 30 : Math.min(rawLimit, 200)
    const rawMinutes = parseInt(searchParams.get('minutes') || '30')
    const minutes = isNaN(rawMinutes) ? 30 : Math.min(rawMinutes, 1440)

    const since = new Date(Date.now() - minutes * 60 * 1000)

    const activities = await prisma.activity.findMany({
      where: {
        timestamp: {
          gte: since
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentId, agentName, action, type, metadata } = body

    const VALID_TYPES = ['task-completed', 'error', 'deployment', 'pr-reviewed', 'test-run']

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'agentId is required and must be a string' }, { status: 400 })
    }
    if (!agentName || typeof agentName !== 'string') {
      return NextResponse.json({ error: 'agentName is required and must be a string' }, { status: 400 })
    }
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'action is required and must be a string' }, { status: 400 })
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type is required and must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const activity = await prisma.activity.create({
      data: {
        agentId,
        agentName,
        action,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
