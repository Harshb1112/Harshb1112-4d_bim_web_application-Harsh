// Script to check all users and their roles
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAllUsers() {
  try {
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
    
    console.log(`\n📊 Total Users: ${users.length}\n`)
    
    const roleCount = {
      admin: 0,
      manager: 0,
      team_leader: 0,
      member: 0
    }
    
    users.forEach((user, index) => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1
      
      console.log(`${index + 1}. ${user.fullName} (${user.email})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Email Verified: ${user.isEmailVerified ? '✅' : '❌'}`)
      
      if (user.teamMemberships.length > 0) {
        console.log(`   Teams:`)
        user.teamMemberships.forEach(tm => {
          console.log(`     - ${tm.team.name} (${tm.role})`)
        })
      } else {
        console.log(`   Teams: None`)
      }
      console.log('')
    })
    
    console.log('📈 Role Summary:')
    console.log(`   Admin: ${roleCount.admin}`)
    console.log(`   Manager: ${roleCount.manager}`)
    console.log(`   Team Leader: ${roleCount.team_leader}`)
    console.log(`   Member: ${roleCount.member}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllUsers()
