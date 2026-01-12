const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserData() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 15 },
      include: {
        teamMemberships: true,
        assignedTasks: true,
        loginSessions: true,
        notifications: true,
        apiKeys: true,
        integrations: true
      }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('\n📊 User Data Summary for:', user.fullName)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👥 Teams:', user.teamMemberships.length)
    console.log('✅ Tasks:', user.assignedTasks.length)
    console.log('🔐 Login Sessions:', user.loginSessions.length)
    console.log('🔔 Notifications:', user.notifications.length)
    console.log('🔑 API Keys:', user.apiKeys.length)
    console.log('🔗 Integrations:', user.integrations.length)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (user.teamMemberships.length === 0) {
      console.log('⚠️  No team memberships - User is not part of any team')
    }
    if (user.assignedTasks.length === 0) {
      console.log('⚠️  No tasks assigned - No tasks are assigned to this user')
    }
    if (user.loginSessions.length === 0) {
      console.log('⚠️  No login sessions - User needs to login to create session')
    }
    if (user.notifications.length === 0) {
      console.log('⚠️  No notifications - No notifications have been created')
    }
    if (user.apiKeys.length === 0) {
      console.log('⚠️  No API keys - User has not generated any API keys')
    }
    if (user.integrations.length === 0) {
      console.log('⚠️  No integrations - User has not connected any integrations')
    }

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserData()
