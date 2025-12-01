// Script to update existing projects with default status
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Update all projects that have null status to 'active'
  const result = await prisma.project.updateMany({
    where: {
      status: null
    },
    data: {
      status: 'active'
    }
  })
  
  console.log(`Updated ${result.count} projects with status 'active'`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
