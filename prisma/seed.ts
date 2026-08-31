import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Ensure all 5 agents exist (including Hermes Main)
  const agents = [
    {
      name: 'Hermes Main',
      color: '#9333EA', // Purple for orchestrator
      status: 'idle',
      currentTask: 'Waiting for task',
      tasksCompleted: 0,
      tasksInQueue: 0,
    },
    {
      name: 'Researcher',
      color: '#3B82F6',
      status: 'idle',
      currentTask: 'Waiting for task',
      tasksCompleted: 0,
      tasksInQueue: 0,
    },
    {
      name: 'Backend',
      color: '#10B981',
      status: 'idle',
      currentTask: 'Waiting for task',
      tasksCompleted: 0,
      tasksInQueue: 0,
    },
    {
      name: 'Frontend',
      color: '#F59E0B',
      status: 'idle',
      currentTask: 'Waiting for task',
      tasksCompleted: 0,
      tasksInQueue: 0,
    },
    {
      name: 'Review',
      color: '#EF4444',
      status: 'idle',
      currentTask: 'Waiting for task',
      tasksCompleted: 0,
      tasksInQueue: 0,
    },
  ]

  for (const agentData of agents) {
    const existing = await prisma.agent.findFirst({
      where: { name: agentData.name },
    })

    if (existing) {
      console.log(`✓ Agent "${agentData.name}" already exists`)
    } else {
      await prisma.agent.create({ data: agentData })
      console.log(`✓ Created agent "${agentData.name}"`)
    }
  }

  // Create metrics record if it doesn't exist
  const metricsCount = await prisma.metrics.count()
  if (metricsCount === 0) {
    await prisma.metrics.create({
      data: {
        tasksCompletedToday: 0,
        tasksInProgress: 0,
        prsReviewed: 0,
        buildStatus: 'passing',
        lastBuildTime: 'never',
        testsPassed: 0,
        testsFailed: 0,
      },
    })
    console.log('✓ Created metrics record')
  } else {
    console.log('✓ Metrics already exist')
  }

  console.log('✅ Seeding complete')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
