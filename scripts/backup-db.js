const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
  console.log('📦 Starting database backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  
  // Create backups directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backup = {
    timestamp,
    users: await prisma.user.findMany(),
    teams: await prisma.team.findMany(),
    teamMemberships: await prisma.teamMembership.findMany(),
    projects: await prisma.project.findMany(),
    tasks: await prisma.task.findMany(),
    models: await prisma.model.findMany(),
    elements: await prisma.element.findMany(),
    dependencies: await prisma.dependency.findMany(),
  };

  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  
  console.log('✅ Backup created successfully!');
  console.log(`📁 File: ${filepath}`);
  console.log(`📊 Stats:`);
  console.log(`   - Users: ${backup.users.length}`);
  console.log(`   - Teams: ${backup.teams.length}`);
  console.log(`   - Projects: ${backup.projects.length}`);
  console.log(`   - Tasks: ${backup.tasks.length}`);
}

backup()
  .catch((e) => {
    console.error('❌ Backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
