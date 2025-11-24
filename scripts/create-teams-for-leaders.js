// Script to create teams for existing team leaders
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTeamsForLeaders() {
  try {
    // Find all team leaders without teams
    const teamLeaders = await prisma.user.findMany({
      where: {
        role: 'team_leader'
      },
      include: {
        teamMemberships: true
      }
    })
    
    console.log(`\n📊 Found ${teamLeaders.length} Team Leaders\n`)
    
    for (const leader of teamLeaders) {
      if (leader.teamMemberships.length === 0) {
        // Create team for this leader with unique name
        const teamName = `${leader.fullName}'s Team (${leader.email.split('@')[0]})`
        const team = await prisma.team.create({
          data: {
            name: teamName,
            code: leader.fullName.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000)
          }
        })
        
        // Add leader to team
        await prisma.teamMembership.create({
          data: {
            userId: leader.id,
            teamId: team.id,
            role: 'leader'
          }
        })
        
        console.log(`✅ Created team "${team.name}" for ${leader.fullName}`)
      } else {
        console.log(`⏭️  ${leader.fullName} already has a team`)
      }
    }
    
    console.log('\n✅ Done!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTeamsForLeaders()
