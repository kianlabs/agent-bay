import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database (Developer Agents)...')

  // Clear existing data
  await prisma.event.deleteMany()
  await prisma.agent.deleteMany()
  await prisma.metrics.deleteMany()

  // Create developer agents
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        name: 'Researcher',
        color: '#3b82f6',
        status: 'working',
        currentTask: 'membaca spesifikasi API authentication',
        tasksCompleted: 12,
        tasksInQueue: 3,
      },
    }),
    prisma.agent.create({
      data: {
        name: 'Frontend',
        color: '#f59e0b',
        status: 'working',
        currentTask: 'menulis komponen Login dengan validation',
        tasksCompleted: 24,
        tasksInQueue: 5,
      },
    }),
    prisma.agent.create({
      data: {
        name: 'Backend',
        color: '#10b981',
        status: 'working',
        currentTask: 'refactor endpoint /api/auth dengan JWT',
        tasksCompleted: 18,
        tasksInQueue: 2,
      },
    }),
    prisma.agent.create({
      data: {
        name: 'Review',
        color: '#8b5cf6',
        status: 'working',
        currentTask: 'review PR #42 - Auth middleware',
        tasksCompleted: 31,
        tasksInQueue: 4,
      },
    }),
  ])

  console.log(`✅ Created ${agents.length} developer agents`)

  // Create metrics
  const metrics = await prisma.metrics.create({
    data: {
      tasksCompletedToday: 15,
      tasksInProgress: 4,
      prsReviewed: 7,
      buildStatus: 'passing',
      lastBuildTime: '2 min ago',
      testsPassed: 142,
      testsFailed: 3,
    },
  })

  console.log('✅ Created metrics:', metrics)

  // Create some events
  await prisma.event.createMany({
    data: [
      {
        agentId: agents[0].id,
        message: 'membaca dokumentasi Auth0',
        timestamp: new Date(Date.now() - 5000),
      },
      {
        agentId: agents[1].id,
        message: 'styling form login',
        timestamp: new Date(Date.now() - 3000),
      },
      {
        agentId: agents[3].id,
        message: 'PR #42 approved ✓',
        timestamp: new Date(),
      },
    ],
  })

  console.log('✅ Created events')
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
