const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkModels() {
  try {
    console.log('Checking models in database...\n')

    const models = await prisma.model.findMany({
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    })

    console.log(`Found ${models.length} models:\n`)
    
    models.forEach(model => {
      console.log(`Model ID: ${model.id}`)
      console.log(`Name: ${model.name}`)
      console.log(`Source: ${model.source || 'NOT SET'}`)
      console.log(`Project: ${model.project.name} (ID: ${model.projectId})`)
      console.log(`Speckle URL: ${model.speckleUrl || 'N/A'}`)
      console.log(`Autodesk URN: ${model.autodeskUrn || 'N/A'}`)
      console.log(`File URL: ${model.fileUrl || 'N/A'}`)
      console.log(`Uploaded: ${model.uploadedAt}`)
      console.log('---\n')
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkModels()
