import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting minimal seed (Admin & Manager only)...')

  console.log('🗑️  Starting fresh database (no existing data to clear)')

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      fullName: 'System Admin',
      passwordHash: adminPassword,
      role: 'admin',
      isEmailVerified: true
    }
  })
  console.log('✅ Admin created: admin@example.com / admin123')

  // Create Manager
  const managerPassword = await bcrypt.hash('manager123', 10)
  const manager = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      fullName: 'System Manager',
      passwordHash: managerPassword,
      role: 'manager',
      isEmailVerified: true
    }
  })
  console.log('✅ Manager created: manager@example.com / manager123')

  console.log('\n🎉 Minimal seed completed!')
  console.log('\n📝 Pre-created Users:')
  console.log('   Admin:   admin@example.com / admin123')
  console.log('   Manager: manager@example.com / manager123')
  console.log('\n💡 All other users (Team Leaders, Members) should register via /register')
  console.log('💡 When Team Leader registers, a team will be auto-created with their name')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
