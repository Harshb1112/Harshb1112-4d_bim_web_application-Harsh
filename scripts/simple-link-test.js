const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function simpleLinkTest() {
  console.log('🔧 Simple test: Creating elements and linking to task...\n')

  try {
    // First, create some test elements with known GUIDs
    const testGuids = [
      '40c95e9d9910c3402b5793725cf458b7',
      'bfc2112a6ff2faaeb212d09f6b524398',
      'e70d3b6baf840245059720412a8d12d6',
      '77f17048108ecc68347c42c4c9e75ab0'
    ]

    console.log('📦 Creating test elements...')
    const createdElements = []

    for (const guid of testGuids) {
      // Check if element already exists
      let element = await prisma.element.findFirst({
        where: { guid }
      })

      if (!element) {
        element = await prisma.element.create({
          data: {
            modelId: 1,
            guid: guid,
            typeName: 'Test.Element'
          }
        })
        console.log(`  ✅ Created element: ${guid}`)
      } else {
        console.log(`  ℹ️  Element already exists: ${guid}`)
      }

      createdElements.push(element)
    }

    // Get or create a test task
    let task = await prisma.task.findFirst({
      where: {
        projectId: 2,
        name: 'Test Construction Phase'
      }
    })

    if (!task) {
      task = await prisma.task.create({
        data: {
          projectId: 2,
          name: 'Test Construction Phase',
          description: 'Test task for 4D simulation colors',
          status: 'IN_PROGRESS',
          progress: 50,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          durationDays: 90,
          color: '#FFFF00'
        }
      })
      console.log(`\n✅ Created task: ${task.name}`)
    } else {
      console.log(`\nℹ️  Using existing task: ${task.name}`)
    }

    // Delete old links for this task
    await prisma.elementTaskLink.deleteMany({
      where: { taskId: task.id }
    })
    console.log('🗑️  Cleared old element links')

    // Create new links
    console.log('\n🔗 Creating element-task links...')
    for (const element of createdElements) {
      await prisma.elementTaskLink.create({
        data: {
          elementId: element.id,
          taskId: task.id
        }
      })
      console.log(`  ✅ Linked: ${element.guid}`)
    }

    // Verify the setup
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

    console.log(`\n✅ Setup complete!`)
    console.log(`\n📊 Task: ${taskWithLinks.name}`)
    console.log(`   Status: ${taskWithLinks.status}`)
    console.log(`   Color: ${taskWithLinks.color}`)
    console.log(`   Element Links: ${taskWithLinks.elementLinks.length}`)
    console.log('\n🔗 Linked Elements:')
    taskWithLinks.elementLinks.forEach((link, i) => {
      console.log(`   ${i + 1}. ${link.element.guid}`)
    })

    console.log('\n📝 Next steps:')
    console.log('   1. Open http://localhost:3000/project/2/workspace')
    console.log('   2. Select task "Test Construction Phase" from left sidebar')
    console.log('   3. Open browser console (F12)')
    console.log('   4. Look for logs starting with 🎨')
    console.log('   5. Elements should highlight in YELLOW color')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

simpleLinkTest()
  .then(() => {
    console.log('\n✨ Test setup completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
