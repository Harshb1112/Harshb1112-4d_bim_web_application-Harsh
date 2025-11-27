const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifySetup() {
  console.log('🔍 Verifying 4D Simulation Setup...\n')

  try {
    // Check project
    const project = await prisma.project.findUnique({
      where: { id: 2 },
      include: {
        models: true
      }
    })

    if (!project) {
      console.log('❌ Project 2 not found')
      return
    }

    console.log('✅ Project found:', project.name)
    console.log('   BIM Source:', project.bimSource)
    console.log('   BIM URL:', project.bimUrl)
    console.log('   Models:', project.models?.length || 0)

    // Check tasks
    const tasks = await prisma.task.findMany({
      where: { projectId: 2 },
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

    console.log(`\n✅ Found ${tasks.length} tasks`)

    tasks.forEach((task, i) => {
      console.log(`\n${i + 1}. ${task.name}`)
      console.log(`   Status: ${task.status}`)
      console.log(`   Color: ${task.color}`)
      console.log(`   Element Links: ${task.elementLinks.length}`)
      
      if (task.elementLinks.length > 0) {
        console.log('   Linked Elements:')
        task.elementLinks.forEach((link, j) => {
          console.log(`     ${j + 1}. ${link.element.guid}`)
        })
      }
    })

    // Check elements
    const elements = await prisma.element.findMany({
      where: { modelId: 1 }
    })

    console.log(`\n✅ Found ${elements.length} elements in database`)
    if (elements.length > 0) {
      console.log('   Sample GUIDs:')
      elements.slice(0, 5).forEach((el, i) => {
        console.log(`     ${i + 1}. ${el.guid}`)
      })
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log(`   ✅ Project: ${project.name}`)
    console.log(`   ✅ Tasks: ${tasks.length}`)
    console.log(`   ✅ Tasks with elements: ${tasks.filter(t => t.elementLinks.length > 0).length}`)
    console.log(`   ✅ Total elements: ${elements.length}`)

    const testTask = tasks.find(t => t.name === 'Test Construction Phase')
    if (testTask && testTask.elementLinks.length > 0) {
      console.log('\n🎯 Test Task Ready!')
      console.log('   Open: http://localhost:3000/project/2/workspace')
      console.log('   Select: "Test Construction Phase"')
      console.log('   Expected: 4 elements highlighted in YELLOW')
    } else {
      console.log('\n⚠️  Test task not properly set up')
      console.log('   Run: node scripts/simple-link-test.js')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifySetup()
  .then(() => {
    console.log('\n✨ Verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
