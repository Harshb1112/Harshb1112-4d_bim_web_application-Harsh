// Manual user verification script
// Run this to verify a user without email link

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyUser(email) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null
      }
    })
    
    console.log('✅ User verified successfully:', user.email)
    console.log('User can now login!')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Replace with actual email
const userEmail = 'testing@example.com'  // CHANGE THIS!
verifyUser(userEmail)
