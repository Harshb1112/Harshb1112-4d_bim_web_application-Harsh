// Remove junior seniority from all team members
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixTeamMembersSeniority() {
  try {
    console.log('🔧 Fixing Team Members seniority...\n')
    
    // Update all team members with junior seniority to null (normal)
    const result = await prisma.teamMembership.updateMany({
      where: {
        role: 'member',
        seniority: 'junior'
      },
      data: {
        seniority: null
      }
    })

    console.log(`✅ Updated ${result.count} Team Members to Normal (removed junior)`)
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTeamMembersSeniority()
