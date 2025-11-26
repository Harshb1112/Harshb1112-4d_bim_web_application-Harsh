// Seed PostgreSQL database with initial data
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

async function seed() {
  try {
    console.log('🌱 Seeding PostgreSQL database...\n')

    // Create Admin
    const adminPassword = await hashPassword('admin123')
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        fullName: 'System Admin',
        email: 'admin@example.com',
        passwordHash: adminPassword,
        role: 'admin',
        isEmailVerified: true
      }
    })
    console.log('✅ Created Admin:', admin.email)

    // Create Manager
    const managerPassword = await hashPassword('manager123')
    const manager = await prisma.user.upsert({
      where: { email: 'manager@example.com' },
      update: {},
      create: {
        fullName: 'System Manager',
        email: 'manager@example.com',
        passwordHash: managerPassword,
        role: 'manager',
        isEmailVerified: true
      }
    })
    console.log('✅ Created Manager:', manager.email)

    // Create Team
    const team = await prisma.team.upsert({
      where: { name: 'Default Team' },
      update: {},
      create: {
        name: 'Default Team',
        code: 'DEF001'
      }
    })
    console.log('✅ Created Team:', team.name)

    // Add Admin and Manager to team
    await prisma.teamMembership.upsert({
      where: {
        userId_teamId: {
          userId: admin.id,
          teamId: team.id
        }
      },
      update: {},
      create: {
        userId: admin.id,
        teamId: team.id,
        role: 'admin'
      }
    })

    await prisma.teamMembership.upsert({
      where: {
        userId_teamId: {
          userId: manager.id,
          teamId: team.id
        }
      },
      update: {},
      create: {
        userId: manager.id,
        teamId: team.id,
        role: 'manager'
      }
    })

    console.log('\n✅ Seeding complete!')
    console.log('\n📝 Login Credentials:')
    console.log('Admin: admin@example.com / admin123')
    console.log('Manager: manager@example.com / manager123')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
