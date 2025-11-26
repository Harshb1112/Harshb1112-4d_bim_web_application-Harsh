const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAdmin() {
  await prisma.teamMembership.updateMany({
    where: { role: 'admin' },
    data: { seniority: null }
  })
  console.log('✅ Fixed Admin seniority')
  await prisma.$disconnect()
}

fixAdmin()
