const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createProject() {
  try {
    // Get admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    })

    if (!admin) {
      console.error('Admin user not found')
      return
    }

    // Create project with ID 18
    const project = await prisma.project.create({
      data: {
        name: 'Bim-4d Project',
        description: '4D BIM construction project',
        createdById: admin.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      }
    })

    console.log('✅ Created project:', project)
    console.log('\nProject ID:', project.id)
    console.log('Project Name:', project.name)
    console.log('\nYou can now access: http://localhost:3000/project/' + project.id)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createProject()
