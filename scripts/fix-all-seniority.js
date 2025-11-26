// Fix seniority for all Team Leaders and Managers
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAllSeniority() {
  try {
    console.log('🔧 Fixing seniority for all roles...\n')
    
    const teams = await prisma.team.findMany({
      include: {
        members: {
          where: {
            OR: [
              { role: 'leader' },
              { role: 'manager' },
              { role: 'member' }
            ]
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    for (const team of teams) {
      // Group by role
      const leaders = team.members.filter(m => m.role === 'leader')
      const managers = team.members.filter(m => m.role === 'manager')
      const members = team.members.filter(m => m.role === 'member')

      // Fix Team Leaders
      if (leaders.length === 1) {
        // Only 1 leader - should be Normal (no seniority)
        await prisma.teamMembership.update({
          where: { id: leaders[0].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set single Team Leader as Normal`)
      } else if (leaders.length === 2) {
        // 2 leaders - 1st Junior, 2nd Simple
        await prisma.teamMembership.update({
          where: { id: leaders[0].id },
          data: { seniority: 'junior' }
        })
        await prisma.teamMembership.update({
          where: { id: leaders[1].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set 2 Team Leaders (Junior, Simple)`)
      } else if (leaders.length >= 3) {
        // 3+ leaders - 1st Senior, middle Junior, last Simple
        await prisma.teamMembership.update({
          where: { id: leaders[0].id },
          data: { seniority: 'senior' }
        })
        for (let i = 1; i < leaders.length - 1; i++) {
          await prisma.teamMembership.update({
            where: { id: leaders[i].id },
            data: { seniority: 'junior' }
          })
        }
        await prisma.teamMembership.update({
          where: { id: leaders[leaders.length - 1].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set ${leaders.length} Team Leaders (Senior, Junior..., Simple)`)
      }

      // Fix Managers (same logic)
      if (managers.length === 1) {
        await prisma.teamMembership.update({
          where: { id: managers[0].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set single Manager as Normal`)
      } else if (managers.length === 2) {
        await prisma.teamMembership.update({
          where: { id: managers[0].id },
          data: { seniority: 'junior' }
        })
        await prisma.teamMembership.update({
          where: { id: managers[1].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set 2 Managers (Junior, Simple)`)
      } else if (managers.length >= 3) {
        await prisma.teamMembership.update({
          where: { id: managers[0].id },
          data: { seniority: 'senior' }
        })
        for (let i = 1; i < managers.length - 1; i++) {
          await prisma.teamMembership.update({
            where: { id: managers[i].id },
            data: { seniority: 'junior' }
          })
        }
        await prisma.teamMembership.update({
          where: { id: managers[managers.length - 1].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set ${managers.length} Managers (Senior, Junior..., Simple)`)
      }

      // Fix Team Members (same logic)
      if (members.length === 1) {
        await prisma.teamMembership.update({
          where: { id: members[0].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set single Team Member as Normal`)
      } else if (members.length === 2) {
        await prisma.teamMembership.update({
          where: { id: members[0].id },
          data: { seniority: null }
        })
        await prisma.teamMembership.update({
          where: { id: members[1].id },
          data: { seniority: 'junior' }
        })
        console.log(`✅ Team "${team.name}": Set 2 Team Members (Normal, Junior)`)
      } else if (members.length >= 3) {
        await prisma.teamMembership.update({
          where: { id: members[0].id },
          data: { seniority: 'senior' }
        })
        for (let i = 1; i < members.length - 1; i++) {
          await prisma.teamMembership.update({
            where: { id: members[i].id },
            data: { seniority: 'junior' }
          })
        }
        await prisma.teamMembership.update({
          where: { id: members[members.length - 1].id },
          data: { seniority: null }
        })
        console.log(`✅ Team "${team.name}": Set ${members.length} Team Members (Senior, Junior..., Normal)`)
      }
    }

    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAllSeniority()
