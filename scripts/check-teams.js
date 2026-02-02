const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeams() {
  try {
    console.log('🔍 Checking teams in database...\n')
    
    // Get all teams
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
        },
        projects: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            members: true,
            projects: true
          }
        }
      }
    })
    
    if (teams.length === 0) {
      console.log('❌ No teams found in database!')
      console.log('\n💡 Solution: Create a team first')
      console.log('   Run: node scripts/create-sample-team.js')
      return
    }
    
    console.log(`✅ Found ${teams.length} team(s):\n`)
    
    teams.forEach((team, index) => {
      console.log(`${index + 1}. Team: ${team.name} (${team.code})`)
      console.log(`   ID: ${team.id}`)
      console.log(`   Members: ${team._count.members}`)
      console.log(`   Projects: ${team._count.projects}`)
      
      if (team.members.length > 0) {
        console.log(`   Team Members:`)
        team.members.forEach(member => {
          console.log(`     - ${member.user.fullName} (${member.user.email}) - Role: ${member.role}`)
        })
      } else {
        console.log(`   ⚠️  No members in this team`)
      }
      
      if (team.projects.length > 0) {
        console.log(`   Projects:`)
        team.projects.forEach(project => {
          console.log(`     - ${project.name} (ID: ${project.id})`)
        })
      }
      
      console.log('')
    })
    
    // Check projects without teams
    const projectsWithoutTeam = await prisma.project.findMany({
      where: {
        teamId: null
      },
      select: {
        id: true,
        name: true
      }
    })
    
    if (projectsWithoutTeam.length > 0) {
      console.log(`\n⚠️  Found ${projectsWithoutTeam.length} project(s) without a team:`)
      projectsWithoutTeam.forEach(project => {
        console.log(`   - ${project.name} (ID: ${project.id})`)
      })
      console.log('\n💡 Assign these projects to a team to see team members')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeams()
