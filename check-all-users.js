// Check all users in database
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        isEmailVerified: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📊 Total Users: ${users.length}\n`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Verified: ${user.isEmailVerified ? '✅ Yes' : '❌ No'}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('')
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
