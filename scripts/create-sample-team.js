const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createSampleTeam() {
  try {
    console.log('🚀 Creating sample team...\n')
    
    // Check if team already exists
    const existingTeam = await prisma.team.findFirst({
      where: {
        code: 'TEAM001'
      }
    })
    
    if (existingTeam) {
      console.log('✅ Team already exists:', existingTeam.name)
      console.log('   ID:', existingTeam.id)
      console.log('   Code:', existingTeam.code)
      return
    }
    
    // Create team
    const team = await prisma.team.create({
      data: {
        name: 'Default Team',
        code: 'TEAM001'
      }
    })
    
    console.log('✅ Team created successfully!')
    console.log('   Name:', team.name)
    console.log('   Code:', team.code)
    console.log('   ID:', team.id)
    
    // Get all users to add as members
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
      }
    })
    
    if (users.length > 0) {
      console.log(`\n📝 Adding ${users.length} user(s) to team...`)
      
      for (const user of users) {
        // Determine team role based on user role
        let teamRole = 'member'
        if (user.role === 'admin') teamRole = 'admin'
        else if (user.role === 'manager') teamRole = 'manager'
        else if (user.role === 'team_leader') teamRole = 'leader'
        
        // Skip if already a member
        const existingMembership = await prisma.teamMembership.findFirst({
          where: {
            teamId: team.id,
            userId: user.id
          }
        })
        
        if (existingMembership) {
          console.log(`   ⏭️  ${user.fullName} already a member`)
          continue
        }
        
        await prisma.teamMembership.create({
          data: {
            teamId: team.id,
            userId: user.id,
            role: teamRole
          }
        })
        
        console.log(`   ✅ Added ${user.fullName} (${user.email}) as ${teamRole}`)
      }
    }
    
    // Assign all projects without team to this team
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
      console.log(`\n📦 Assigning ${projectsWithoutTeam.length} project(s) to team...`)
      
      for (const project of projectsWithoutTeam) {
        await prisma.project.update({
          where: { id: project.id },
          data: { teamId: team.id }
        })
        console.log(`   ✅ Assigned "${project.name}" to team`)
      }
    }
    
    console.log('\n✨ Done! Team setup complete.')
    console.log('\n💡 Now refresh your browser and check the Team tab')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleTeam()
