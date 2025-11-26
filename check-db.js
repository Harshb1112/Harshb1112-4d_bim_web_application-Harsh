const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('Checking database...\n')
    
    // Check users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    })
    console.log('Users:', users)
    
    // Check projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, createdById: true }
    })
    console.log('\nProjects:', projects)
    
    // Check if project 18 exists
    const project18 = await prisma.project.findUnique({
      where: { id: 18 },
      include: {
        projectUsers: true,
        team: {
          include: {
            members: true
          }
        }
      }
    })
    console.log('\nProject 18:', project18)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
