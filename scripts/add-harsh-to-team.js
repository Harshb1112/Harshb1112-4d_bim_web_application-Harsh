const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addHarshToTeam() {
  const user = await prisma.user.findUnique({
    where: { email: 'harshbagadiya.ce@gmail.com' }
  })
  
  const team = await prisma.team.findFirst()
  
  if (user && team) {
    const existing = await prisma.teamMembership.findFirst({
      where: { userId: user.id, teamId: team.id }
    })
    
    if (!existing) {
      await prisma.teamMembership.create({
        data: {
          userId: user.id,
          teamId: team.id,
          role: 'member'
        }
      })
      console.log('✅ Added harsh to team')
    } else {
      console.log('⏭️  harsh already in team')
    }
  }
  
  await prisma.$disconnect()
}

addHarshToTeam()
