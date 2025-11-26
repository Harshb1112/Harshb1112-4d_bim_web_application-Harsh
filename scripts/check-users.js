// Quick script to check all users in database
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('📊 Checking all users in database...\n')
    
    const users = await prisma.user.findMany({
      include: {
        teamMemberships: {
          include: {
            team: true
          }
        }
      },
      orderBy: {
        role: 'asc'
      }
    })

    console.log(`Total Users: ${users.length}\n`)

    users.forEach(user => {
      console.log(`👤 ${user.fullName}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Teams: ${user.teamMemberships.map(m => m.team.name).join(', ') || 'None'}`)
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`)
      console.log('')
    })

    // Count by role
    const roleCount = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})

    console.log('📈 Users by Role:')
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
