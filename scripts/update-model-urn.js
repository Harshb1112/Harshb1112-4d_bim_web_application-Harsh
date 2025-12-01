// Script to update model URN in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateModelUrn() {
  const modelId = 18; // Your model ID
  const newUrn = 'urn:adsk.wipprod:dm.lineage:Qf5stwO_UGeVvyeZsURhHw'; // Correct file URN

  try {
    // First, let's see current value
    const currentModel = await prisma.model.findUnique({
      where: { id: modelId }
    });
    
    console.log('Current model:', currentModel);
    console.log('Current sourceId:', currentModel?.sourceId);

    // Update the URN
    const updated = await prisma.model.update({
      where: { id: modelId },
      data: { sourceId: newUrn }
    });

    console.log('\n✅ Updated successfully!');
    console.log('New sourceId:', updated.sourceId);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateModelUrn();
