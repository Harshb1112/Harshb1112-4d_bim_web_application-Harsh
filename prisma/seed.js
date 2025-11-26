const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SAFE database seed...');
  console.log('✅ Existing data will NOT be deleted');
  console.log('');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);

  // Check if Admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@company.com' }
  });

  if (existingAdmin) {
    console.log('✓ Admin already exists - skipping');
  } else {
    console.log('👤 Creating Admin...');
    await prisma.user.create({
      data: {
        fullName: 'Admin User',
        email: 'admin@company.com',
        passwordHash: adminPassword,
        role: 'admin',
        isEmailVerified: true,
      },
    });
    console.log('✅ Admin created');
  }

  // Check if Manager exists
  const existingManager = await prisma.user.findUnique({
    where: { email: 'manager@company.com' }
  });

  if (existingManager) {
    console.log('✓ Manager already exists - skipping');
  } else {
    console.log('👤 Creating Manager...');
    await prisma.user.create({
      data: {
        fullName: 'Project Manager',
        email: 'manager@company.com',
        passwordHash: managerPassword,
        role: 'manager',
        isEmailVerified: true,
      },
    });
    console.log('✅ Manager created');
  }

  // Count existing data
  const userCount = await prisma.user.count();
  const projectCount = await prisma.project.count();
  const taskCount = await prisma.task.count();
  const teamCount = await prisma.team.count();

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📊 Current Database Summary:');
  console.log(`   - Users: ${userCount}`);
  console.log(`   - Teams: ${teamCount}`);
  console.log(`   - Projects: ${projectCount}`);
  console.log(`   - Tasks: ${taskCount}`);
  console.log('');
  console.log('🔑 Default Login Credentials:');
  console.log('   Admin - Email: admin@company.com | Password: admin123');
  console.log('   Manager - Email: manager@company.com | Password: manager123');
  console.log('');
  console.log('✅ Your existing data is SAFE!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
