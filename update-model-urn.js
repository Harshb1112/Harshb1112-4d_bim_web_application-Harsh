const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateModelUrn() {
  try {
    console.log('Updating model URN...\n')

    // Update model ID 3 (Autodisk-4D) with a test URN
    const updated = await prisma.model.update({
      where: { id: 3 },
      data: {
        sourceId: 'urn:dXJuOmFkc2sud2lwcHJvZDpmcy5maWxlOnZmLnlvdXJfdXJuX2hlcmU',
        sourceUrl: 'https://example.com/model.rvt',
        source: 'autodesk_construction_cloud'
      }
    })

    console.log('✅ Model updated successfully!')
    console.log('Model ID:', updated.id)
    console.log('Name:', updated.name)
    console.log('Source:', updated.source)
    console.log('Autodesk URN (sourceId):', updated.sourceId)
    console.log('File URL (sourceUrl):', updated.sourceUrl)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateModelUrn()
