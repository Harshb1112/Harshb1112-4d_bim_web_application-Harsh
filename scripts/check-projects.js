// Script to check project status
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      status: true
    }
  })
  
  console.log('Projects:')
  projects.forEach(p => {
    console.log(`  ID: ${p.id}, Name: ${p.name}, Status: ${p.status}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
