const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        passwordHash: true,
      }
    });

    console.log('=== All Users ===');
    users.forEach(user => {
      console.log(`\nID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.fullName}`);
      console.log(`Role: ${user.role}`);
      console.log(`Email Verified: ${user.isEmailVerified}`);
      console.log(`Has Password: ${user.passwordHash ? 'Yes' : 'No'}`);
    });

    console.log(`\n\nTotal users: ${users.length}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
