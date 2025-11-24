// Script to check teams in database
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTeams() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    })
    
    console.log(`\n📊 Total Teams: ${teams.length}\n`)
    
    if (teams.length === 0) {
      console.log('❌ No teams found!')
      console.log('\nCreating sample teams...\n')
      
      // Create sample teams
      const team1 = await prisma.team.create({
        data: {
          name: 'Development Team',
          code: 'DEV'
        }
      })
      
      const team2 = await prisma.team.create({
        data: {
          name: 'Design Team',
          code: 'DESIGN'
        }
      })
      
      console.log('✅ Created sample teams:')
      console.log('  - Development Team (DEV)')
      console.log('  - Design Team (DESIGN)')
    } else {
      teams.forEach((team, index) => {
        console.log(`${index + 1}. ${team.name} (${team.code})`)
        console.log(`   Members: ${team.members.length}`)
        team.members.forEach(member => {
          console.log(`     - ${member.user.fullName} (${member.user.role})`)
        })
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeams()
