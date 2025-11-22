const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeams() {
  try {
    const teams = await prisma.team.findMany()
    console.log('Total teams in database:', teams.length)
    teams.forEach(t => {
      console.log(`- ${t.name} (ID: ${t.id}, Code: ${t.code})`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeams()
