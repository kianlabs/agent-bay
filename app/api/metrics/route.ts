import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const metrics = await prisma.metrics.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!metrics) {
      return NextResponse.json({
        leadsToday: 0,
        inFlight: 0,
        emailsSent: 0,
        replies: 0,
        interested: 0,
        totalLeads: 0,
      })
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
