const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUser() {
  const user = await prisma.user.update({
    where: { id: 15 },
    data: {
      email: 'r2g@krishnaos.com',
      fullName: 'R2G User'
    }
  });
  
  console.log('✅ User ID 15 updated:');
  console.log('   Email:', user.email);
  console.log('   Name:', user.fullName);
  
  await prisma.$disconnect();
}

updateUser();
