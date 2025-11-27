const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateTaskElements() {
  console.log('🔧 Updating task element links with correct Speckle GUIDs...\n')

  try {
    const taskId = 4

    // Get the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        elementLinks: {
          include: {
            element: true
          }
        }
      }
    })

    if (!task) {
      console.log('❌ Task not found')
      return
    }

    console.log(`📝 Task: ${task.name}`)
    console.log(`🔗 Current element links: ${task.elementLinks.length}`)

    // Delete old links
    await prisma.elementTaskLink.deleteMany({
      where: { taskId }
    })
    console.log('🗑️  Deleted old element links')

    // Get correct Speckle elements
    const speckleElements = await prisma.element.findMany({
      where: {
        modelId: 1,
        guid: {
          in: [
            '40c95e9d9910c3402b5793725cf458b7',
            'bfc2112a6ff2faaeb212d09f6b524398',
            'e70d3b6baf840245059720412a8d12d6',
            '77f17048108ecc68347c42c4c9e75ab0'
          ]
        }
      }
    })

    console.log(`\n📦 Found ${speckleElements.length} Speckle elements`)

    // Create new links
    for (const element of speckleElements) {
      await prisma.elementTaskLink.create({
        data: {
          elementId: element.id,
          taskId: taskId
        }
      })
      console.log(`  ✅ Linked: ${element.guid}`)
    }

    // Verify
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
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

    console.log(`\n✅ Updated task with ${updatedTask.elementLinks.length} element links`)
    console.log('\n🔗 Element links:')
    updatedTask.elementLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.element.guid} (${link.element.typeName || 'Unknown'})`)
    })

    console.log('\n📝 Next steps:')
    console.log('  1. Open project workspace page')
    console.log('  2. Select the task "Test Construction Phase"')
    console.log('  3. Check browser console for color application logs')
    console.log('  4. Elements should now show YELLOW color (IN_PROGRESS status)')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateTaskElements()
  .then(() => {
    console.log('\n✨ Update completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
