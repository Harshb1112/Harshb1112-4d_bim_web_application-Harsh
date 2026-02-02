const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function assignProjectsToTeam() {
  try {
    console.log('🚀 Assigning projects to team...\n')
    
    // Get the first team (Arrow team)
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
    
    // Get all projects without a team
    const projectsWithoutTeam = await prisma.project.findMany({
      where: {
        teamId: null
      },
      select: {
        id: true,
        name: true
      }
    })
    
    if (projectsWithoutTeam.length === 0) {
      console.log('✅ All projects already have teams assigned!')
      return
    }
    
    console.log(`📦 Found ${projectsWithoutTeam.length} project(s) without team:\n`)
    
    // Assign each project to the team
    for (const project of projectsWithoutTeam) {
      await prisma.project.update({
        where: { id: project.id },
        data: { teamId: team.id }
      })
      
      console.log(`   ✅ Assigned "${project.name}" (ID: ${project.id}) to ${team.name}`)
    }
    
    console.log('\n✨ Done! All projects assigned to team.')
    console.log('\n💡 Now refresh your browser and check the Team tab')
    console.log('   You should see team members now!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

assignProjectsToTeam()
