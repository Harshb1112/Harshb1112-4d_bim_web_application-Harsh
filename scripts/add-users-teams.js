const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function addUsersAndTeams() {
  try {
    console.log('🔄 Adding teams and users...\n');

    // Add teams
    const team7 = await prisma.team.upsert({
      where: { id: 7 },
      update: {},
      create: {
        id: 7,
        name: 'Arrow team',
        code: 'ARR618'
      }
    });
    console.log('✅ Team created:', team7.name);

    const team8 = await prisma.team.upsert({
      where: { id: 8 },
      update: {},
      create: {
        id: 8,
        name: 'HARSH B',
        code: 'HAR690'
      }
    });
    console.log('✅ Team created:', team8.name);

    // Add users
    const defaultPassword = await bcrypt.hash('password123', 10);

    // User ID 15 (project creator)
    const user15 = await prisma.user.upsert({
      where: { id: 15 },
      update: {},
      create: {
        id: 15,
        fullName: 'Project Creator',
        email: 'creator@krishnaos.com',
        passwordHash: defaultPassword,
        role: 'manager',
        isEmailVerified: true
      }
    });
    console.log('✅ User created:', user15.email);

    // User ID 21 (team leader - megs)
    const user21 = await prisma.user.upsert({
      where: { id: 21 },
      update: {},
      create: {
        id: 21,
        fullName: 'Megs',
        email: 'megs@krishnaos.com',
        passwordHash: defaultPassword,
        role: 'leader',
        isEmailVerified: true
      }
    });
    console.log('✅ User created:', user21.email);

    // User ID 29 (harsh)
    const user29 = await prisma.user.upsert({
      where: { id: 29 },
      update: {},
      create: {
        id: 29,
        fullName: 'Harsh Bagadiya',
        email: 'harsh.bagadiya@krishnaos.com',
        passwordHash: defaultPassword,
        role: 'member',
        isEmailVerified: true
      }
    });
    console.log('✅ User created:', user29.email);

    // Add team memberships
    await prisma.teamMembership.upsert({
      where: { 
        userId_teamId: { userId: 21, teamId: 7 }
      },
      update: {},
      create: {
        userId: 21,
        teamId: 7,
        role: 'leader'
      }
    });
    console.log('✅ Team membership: Megs → Arrow team (leader)');

    console.log('\n✨ All users and teams added successfully!');
    console.log('\n📝 Login credentials (all users):');
    console.log('   Password: password123');
    console.log('\n   - creator@krishnaos.com (Manager)');
    console.log('   - megs@krishnaos.com (Team Leader)');
    console.log('   - harsh.bagadiya@krishnaos.com (Member)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUsersAndTeams();
