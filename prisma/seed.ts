import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'admin'
    }
  })
  console.log('✅ Admin created:', admin.email)

  // Create Manager
  const managerPassword = await bcrypt.hash('manager123', 12)
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      fullName: 'Project Manager',
      email: 'manager@example.com',
      passwordHash: managerPassword,
      role: 'manager'
    }
  })
  console.log('✅ Manager created:', manager.email)

  // Create 4 Teams
  const teams = []
  for (const teamName of ['Team A', 'Team B', 'Team C', 'Team D']) {
    const team = await prisma.team.upsert({
      where: { name: teamName },
      update: {},
      create: {
        name: teamName,
        code: teamName.replace(' ', '_').toUpperCase()
      }
    })
    teams.push(team)
    console.log(`✅ ${teamName} created`)
  }

  // Create Team Leaders (one for each team)
  const teamLeaders = []
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    const leaderPassword = await bcrypt.hash(`leader${i + 1}123`, 12)
    
    const leader = await prisma.user.upsert({
      where: { email: `leader${i + 1}@example.com` },
      update: {},
      create: {
        fullName: `${team.name} Leader`,
        email: `leader${i + 1}@example.com`,
        passwordHash: leaderPassword,
        role: 'team_leader'
      }
    })

    // Assign leader to team
    await prisma.teamMembership.upsert({
      where: {
        userId_teamId: {
          userId: leader.id,
          teamId: team.id
        }
      },
      update: {},
      create: {
        userId: leader.id,
        teamId: team.id,
        role: 'leader'
      }
    })

    teamLeaders.push(leader)
    console.log(`✅ ${leader.fullName} created and assigned to ${team.name}`)
  }

  // Create Team Members (3-4 members per team)
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    const memberCount = 3 + Math.floor(Math.random() * 2) // 3 or 4 members

    for (let j = 0; j < memberCount; j++) {
      const memberPassword = await bcrypt.hash(`member${i}${j}123`, 12)
      const memberEmail = `member${i + 1}_${j + 1}@example.com`

      const member = await prisma.user.upsert({
        where: { email: memberEmail },
        update: {},
        create: {
          fullName: `${team.name} Member ${j + 1}`,
          email: memberEmail,
          passwordHash: memberPassword,
          role: 'viewer'
        }
      })

      await prisma.teamMembership.upsert({
        where: {
          userId_teamId: {
            userId: member.id,
            teamId: team.id
          }
        },
        update: {},
        create: {
          userId: member.id,
          teamId: team.id,
          role: 'member'
        }
      })

      console.log(`✅ ${member.fullName} created and assigned to ${team.name}`)
    }
  }

  // Create sample projects (2 per team)
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    const leader = teamLeaders[i]

    for (let j = 0; j < 2; j++) {
      const project = await prisma.project.create({
        data: {
          name: `${team.name} Project ${j + 1}`,
          description: `Sample project for ${team.name}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          createdById: manager.id,
          teamId: team.id,
          teamLeaderId: leader.id
        }
      })

      // Create sample tasks for each project
      const taskStatuses = ['todo', 'in_progress', 'done']
      for (let k = 0; k < 5; k++) {
        await prisma.task.create({
          data: {
            name: `Task ${k + 1} for ${project.name}`,
            description: `Sample task description`,
            projectId: project.id,
            teamId: team.id,
            status: taskStatuses[k % 3],
            priority: k % 2 === 0 ? 'high' : 'medium',
            progress: k * 20,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })
      }

      console.log(`✅ Project "${project.name}" created with 5 tasks`)
    }
  }

  console.log('🎉 Seed completed successfully!')
  console.log('\n📝 Login Credentials:')
  console.log('Admin: admin@example.com / admin123')
  console.log('Manager: manager@example.com / manager123')
  console.log('Team A Leader: leader1@example.com / leader1123')
  console.log('Team B Leader: leader2@example.com / leader2123')
  console.log('Team C Leader: leader3@example.com / leader3123')
  console.log('Team D Leader: leader4@example.com / leader4123')
  console.log('Team Members: member1_1@example.com / member00123 (etc.)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })