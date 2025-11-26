import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing email verification...')
  
  // Update all users to be verified
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
  
  console.log(`✅ Updated ${result.count} users - all emails now verified!`)
  
  // Show all users
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isEmailVerified: true
    }
  })
  
  console.log('\n📋 All Users:')
  users.forEach(user => {
    console.log(`  ${user.email} (${user.role}) - Verified: ${user.isEmailVerified ? '✅' : '❌'}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
