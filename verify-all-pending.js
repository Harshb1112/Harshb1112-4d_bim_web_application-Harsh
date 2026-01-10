// Verify all pending users
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyAllPending() {
  try {
    const result = await prisma.user.updateMany({
      where: {
        isEmailVerified: false
      },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null
      }
    })
    
    console.log(`✅ Verified ${result.count} users successfully!`)
    console.log('All users can now login.')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verifyAllPending()
