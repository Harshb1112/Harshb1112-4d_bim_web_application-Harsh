const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true, role: true }
  });
  
  console.log('\n=== Current Users ===');
  users.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.fullName} | Email: ${u.email} | Role: ${u.role}`);
  });
  
  const teams = await prisma.team.findMany();
  console.log('\n=== Current Teams ===');
  teams.forEach(t => {
    console.log(`ID: ${t.id} | Name: ${t.name}`);
  });
  
  await prisma.$disconnect();
}

checkUsers();
