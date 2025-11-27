const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetAndSync() {
  console.log('🔄 Resetting elements and syncing from Speckle...\n')

  try {
    // Delete all element-task links first
    const deletedLinks = await prisma.elementTaskLink.deleteMany({})
    console.log(`🗑️  Deleted ${deletedLinks.count} element-task links`)

    // Delete all elements
    const deletedElements = await prisma.element.deleteMany({})
    console.log(`🗑️  Deleted ${deletedElements.count} elements`)

    console.log('\n✅ Database cleared!')
    console.log('\n📝 Next step:')
    console.log('   Run: node scripts/sync-speckle-elements.js 2 1')
    console.log('   This will sync elements from Speckle with correct GUIDs')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetAndSync()
  .then(() => {
    console.log('\n✨ Reset completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
