// Script to verify all existing users in database
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyAllUsers() {
  try {
    console.log('Verifying all users...')
    
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
    
    console.log(`✅ Verified ${result.count} users`)
    
    // Show all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true
      }
    })
    
    console.log('\nAll users:')
    console.table(users)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyAllUsers()
