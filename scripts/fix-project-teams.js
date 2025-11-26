// Script to assign teams to projects that don't have one
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixProjectTeams() {
  try {
    console.log('🔍 Checking projects without teams...')
    
    // Find projects without teams
    const projectsWithoutTeams = await prisma.project.findMany({
      where: {
        teamId: null
      },
      include: {
        createdBy: {
          include: {
            teamMemberships: {
              include: {
                team: true
              }
            }
          }
        }
      }
    })

    console.log(`Found ${projectsWithoutTeams.length} projects without teams`)

    for (const project of projectsWithoutTeams) {
      // Try to assign to creator's team
      if (project.createdBy?.teamMemberships?.length > 0) {
        const team = project.createdBy.teamMemberships[0].team
        await prisma.project.update({
          where: { id: project.id },
          data: { teamId: team.id }
        })
        console.log(`✅ Assigned project "${project.name}" to team "${team.name}"`)
      } else {
        console.log(`⚠️  Project "${project.name}" creator has no team - skipping`)
      }
    }

    // Show summary
    const allProjects = await prisma.project.findMany({
      include: {
        team: true
      }
    })

    console.log('\n📊 Summary:')
    console.log(`Total projects: ${allProjects.length}`)
    console.log(`Projects with teams: ${allProjects.filter(p => p.teamId).length}`)
    console.log(`Projects without teams: ${allProjects.filter(p => !p.teamId).length}`)

    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixProjectTeams()
