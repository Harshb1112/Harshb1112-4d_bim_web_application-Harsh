const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testProjectAPI() {
  console.log('🧪 Testing Project Creation Prerequisites...\n')

  try {
    // Check teams
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

    console.log(`✅ Found ${teams.length} teams:`)
    teams.forEach((team, i) => {
      console.log(`\n${i + 1}. ${team.name} (ID: ${team.id})`)
      console.log(`   Code: ${team.code}`)
      console.log(`   Members: ${team.members.length}`)
      team.members.forEach(m => {
        console.log(`     - ${m.user.fullName} (${m.user.email}) - ${m.role}`)
      })
    })

    // Check users who can create projects
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'manager']
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
      }
    })

    console.log(`\n✅ Found ${admins.length} users who can create projects:`)
    admins.forEach((user, i) => {
      console.log(`${i + 1}. ${user.fullName} (${user.email}) - ${user.role}`)
    })

    // Check existing projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        teamId: true
      }
    })

    console.log(`\n✅ Found ${projects.length} existing projects`)

    // Provide test data
    if (teams.length > 0 && admins.length > 0) {
      console.log('\n📝 Test Data for Project Creation:')
      console.log('   Project Name: "Auto-Bim"')
      console.log('   Description: "testing"')
      console.log(`   Team ID: ${teams[0].id} (${teams[0].name})`)
      console.log('   BIM Source: "local" (Local IFC File)')
      console.log('   File: ES-04-042550_RT_AL...NAS ATW_42550_BB.ifc')
      
      const teamLeaders = teams[0].members.filter(m => m.role === 'leader')
      if (teamLeaders.length > 0) {
        console.log(`   Team Leader: ${teamLeaders[0].user.fullName} (ID: ${teamLeaders[0].userId})`)
      }

      console.log('\n✅ All prerequisites met!')
      console.log('\n📝 Next steps:')
      console.log('   1. Make sure dev server is running: npm run dev')
      console.log('   2. Make sure you\'re logged in as admin/manager')
      console.log('   3. Try creating the project again')
      console.log('   4. Check server console for any errors')
    } else {
      console.log('\n❌ Missing prerequisites:')
      if (teams.length === 0) {
        console.log('   - No teams found. Create a team first.')
      }
      if (admins.length === 0) {
        console.log('   - No admin/manager users found.')
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testProjectAPI()
  .then(() => {
    console.log('\n✨ Test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
