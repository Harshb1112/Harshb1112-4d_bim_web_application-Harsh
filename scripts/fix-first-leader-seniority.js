// Fix first team leader - remove seniority label
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixFirstLeaderSeniority() {
  try {
    console.log('🔧 Fixing first team leader seniority...\n')
    
    // Get all teams
    const teams = await prisma.team.findMany({
      include: {
        members: {
          where: {
            role: 'leader'
          },
          orderBy: {
            createdAt: 'asc' // Oldest first
          }
        }
      }
    })

    for (const team of teams) {
      if (team.members.length === 1) {
        // Only one leader - remove seniority label
        const leader = team.members[0]
        await prisma.teamMembership.update({
          where: { id: leader.id },
          data: { seniority: null }
        })
        console.log(`✅ Removed seniority from first leader in team "${team.name}"`)
      } else if (team.members.length > 1) {
        // Multiple leaders - first is senior, rest are junior
        const firstLeader = team.members[0]
        await prisma.teamMembership.update({
          where: { id: firstLeader.id },
          data: { seniority: 'senior' }
        })
        console.log(`✅ Set first leader as Senior in team "${team.name}"`)
        
        for (let i = 1; i < team.members.length; i++) {
          await prisma.teamMembership.update({
            where: { id: team.members[i].id },
            data: { seniority: 'junior' }
          })
          console.log(`✅ Set leader ${i+1} as Junior in team "${team.name}"`)
        }
      }
    }

    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixFirstLeaderSeniority()
