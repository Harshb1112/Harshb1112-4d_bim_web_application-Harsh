const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAIKey() {
  try {
    console.log('🔧 Fixing AI API key...');
    
    // Clear the corrupted key
    await prisma.user.update({
      where: { id: 1 }, // Admin user
      data: {
        aiApiKey: null
      }
    });
    
    console.log('✅ Cleared corrupted API key');
    console.log('📝 Now go to Settings and add your API key again');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAIKey();
