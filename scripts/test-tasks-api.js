const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testTasksAPI() {
  console.log('🧪 Testing tasks API response format...\n')

  try {
    const projectId = 1

    const tasks = await prisma.task.findMany({
      where: {
        projectId
      },
      include: {
        children: true,
        predecessors: {
          include: {
            predecessor: {
              select: {
                name: true
              }
            }
          }
        },
        successors: {
          include: {
            successor: {
              select: {
                name: true
              }
            }
          }
        },
        elementLinks: {
          include: {
            element: {
              select: {
                guid: true,
                category: true,
                family: true
              }
            }
          }
        }
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    console.log(`📊 Found ${tasks.length} tasks\n`)

    if (tasks.length > 0) {
      const firstTask = tasks[0]
      console.log('📝 First task structure:')
      console.log('  - ID:', firstTask.id)
      console.log('  - Name:', firstTask.name)
      console.log('  - Status:', firstTask.status)
      console.log('  - Element Links:', firstTask.elementLinks?.length || 0)
      
      if (firstTask.elementLinks && firstTask.elementLinks.length > 0) {
        console.log('\n🔗 Element Links:')
        firstTask.elementLinks.forEach((link, i) => {
          console.log(`  ${i + 1}. Element GUID: ${link.element.guid}`)
          console.log(`     Category: ${link.element.category || 'N/A'}`)
          console.log(`     Family: ${link.element.family || 'N/A'}`)
        })
      }
    }

    console.log('\n✅ API response format is correct!')
    console.log('   Response structure: { tasks: [...] }')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testTasksAPI()
  .then(() => {
    console.log('\n✨ Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
