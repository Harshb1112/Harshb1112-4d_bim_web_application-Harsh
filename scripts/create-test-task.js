const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestTask() {
  console.log('🔧 Creating test task with element links...\n')

  try {
    const projectId = 2
    const modelId = 1

    // Get some elements from database
    const elements = await prisma.element.findMany({
      where: { modelId },
      take: 4
    })

    if (elements.length === 0) {
      console.log('❌ No elements found in database')
      console.log('   Run: node scripts/sync-speckle-elements.js 1 1')
      return
    }

    console.log(`📦 Found ${elements.length} elements`)

    // Create a test task
    const task = await prisma.task.create({
      data: {
        projectId: projectId,
        name: 'Test Construction Phase',
        description: 'Test task for 4D simulation',
        status: 'IN_PROGRESS',
        progress: 50,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        durationDays: 90,
        color: '#FFFF00'
      }
    })

    console.log(`✅ Created task: ${task.name} (ID: ${task.id})`)

    // Link elements to task
    for (const element of elements) {
      await prisma.elementTaskLink.create({
        data: {
          elementId: element.id,
          taskId: task.id
        }
      })
      console.log(`  🔗 Linked element: ${element.guid}`)
    }

    // Verify the task with links
    const taskWithLinks = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        elementLinks: {
          include: {
            element: {
              select: {
                guid: true,
                typeName: true
              }
            }
          }
        }
      }
    })

    console.log(`\n✅ Task created with ${taskWithLinks.elementLinks.length} element links`)
    console.log('\n📋 Task structure:')
    console.log(JSON.stringify(taskWithLinks, null, 2))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createTestTask()
  .then(() => {
    console.log('\n✨ Test task created!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
