// Check team members in database
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeamMembers() {
  try {
    console.log('📊 Checking team members...\n')
    
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    })

    teams.forEach(team => {
      console.log(`🏢 Team: ${team.name} (${team.code})`)
      console.log(`   Members: ${team.members.length}`)
      
      if (team.members.length > 0) {
        team.members.forEach(member => {
          const seniorityLabel = member.seniority ? ` [${member.seniority}]` : ''
          console.log(`   - ${member.user.fullName} (${member.user.role}) - Team Role: ${member.role}${seniorityLabel}`)
        })
      } else {
        console.log('   ⚠️  No members!')
      }
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeamMembers()
