// Verify Harsh Bagadiya manually
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyUser() {
  try {
    const user = await prisma.user.update({
      where: { email: 'harsh.bagadiya@krishnaos.com' },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null
      }
    })
    
    console.log('✅ Harsh Bagadiya verified successfully!')
    console.log('You can now login with this email.')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verifyUser()
