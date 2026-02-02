const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addAllUsersToTeam() {
  try {
    console.log('🚀 Adding all users to team...\n')
    
    // Get the first team
    const team = await prisma.team.findFirst({
      select: {
        id: true,
        name: true,
        code: true
      }
    })
    
    if (!team) {
      console.log('❌ No team found! Create a team first.')
      return
    }
    
    console.log(`✅ Found team: ${team.name} (${team.code})`)
    console.log(`   Team ID: ${team.id}\n`)
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
      }
    })
    
    if (users.length === 0) {
      console.log('❌ No users found in database!')
      return
    }
    
    console.log(`📝 Found ${users.length} user(s) in database:\n`)
    
    let added = 0
    let skipped = 0
    
    for (const user of users) {
      // Check if already a member
      const existingMembership = await prisma.teamMembership.findFirst({
        where: {
          teamId: team.id,
          userId: user.id
        }
      })
      
      if (existingMembership) {
        console.log(`   ⏭️  ${user.fullName} (${user.email}) - Already a member`)
        skipped++
        continue
      }
      
      // Determine team role based on user role
      let teamRole = 'member'
      if (user.role === 'admin') teamRole = 'admin'
      else if (user.role === 'manager') teamRole = 'manager'
      else if (user.role === 'team_leader') teamRole = 'leader'
      else if (user.role === 'viewer') teamRole = 'member'
      
      // Add to team
      await prisma.teamMembership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: teamRole
        }
      })
      
      console.log(`   ✅ Added ${user.fullName} (${user.email}) as ${teamRole}`)
      added++
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Added: ${added}`)
    console.log(`   ⏭️  Skipped (already members): ${skipped}`)
    console.log(`   📝 Total users: ${users.length}`)
    
    console.log('\n✨ Done! All users added to team.')
    console.log('\n💡 Now refresh your browser and check the Team tab')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addAllUsersToTeam()
