const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateProjectSpeckle() {
  console.log('🔧 Updating project with Speckle info...\n')

  try {
    // Get the model to find Speckle URL
    const model = await prisma.model.findFirst({
      where: { projectId: 2 }
    })

    if (!model) {
      console.log('❌ No model found for project 2')
      return
    }

    console.log('📦 Model found:', model.name)
    console.log('   URN:', model.urn)

    // Update project with Speckle info
    const updated = await prisma.project.update({
      where: { id: 2 },
      data: {
        bimSource: 'SPECKLE',
        bimUrl: model.urn || 'https://app.speckle.systems/projects/YOUR_PROJECT/models/YOUR_MODEL'
      }
    })

    console.log('\n✅ Project updated!')
    console.log('   BIM Source:', updated.bimSource)
    console.log('   BIM URL:', updated.bimUrl)

    console.log('\n📝 Note:')
    console.log('   If the BIM URL is not correct, update it manually in the database')
    console.log('   or through the project settings UI')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateProjectSpeckle()
  .then(() => {
    console.log('\n✨ Update complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
