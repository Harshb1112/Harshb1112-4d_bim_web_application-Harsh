// Assign Admin and Manager to all teams
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function assignAdminManagerToTeams() {
  try {
    console.log('🔧 Assigning Admin and Manager to teams...\n')
    
    // Get all admins and managers
    const adminsManagers = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'manager']
        }
      }
    })

    // Get all teams
    const teams = await prisma.team.findMany()

    console.log(`Found ${adminsManagers.length} Admin/Manager users`)
    console.log(`Found ${teams.length} teams\n`)

    for (const user of adminsManagers) {
      for (const team of teams) {
        // Check if already a member
        const existing = await prisma.teamMembership.findFirst({
          where: {
            userId: user.id,
            teamId: team.id
          }
        })

        if (!existing) {
          await prisma.teamMembership.create({
            data: {
              userId: user.id,
              teamId: team.id,
              role: user.role
            }
          })
          console.log(`✅ Added ${user.fullName} (${user.role}) to team "${team.name}"`)
        } else {
          console.log(`⏭️  ${user.fullName} already in team "${team.name}"`)
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

assignAdminManagerToTeams()
