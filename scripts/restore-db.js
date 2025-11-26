const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restore() {
  // Get backup file from command line argument
  const backupFile = process.argv[2];
  
  if (!backupFile) {
    console.error('❌ Please provide backup file path');
    console.log('Usage: npm run restore backups/backup-XXXX.json');
    process.exit(1);
  }

  const filepath = path.join(process.cwd(), backupFile);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Backup file not found: ${filepath}`);
    process.exit(1);
  }

  console.log('📦 Starting database restore...');
  console.log(`📁 File: ${filepath}`);
  
  const backup = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  
  console.log('⚠️  WARNING: This will DELETE all existing data!');
  console.log('📊 Backup contains:');
  console.log(`   - Users: ${backup.users?.length || 0}`);
  console.log(`   - Teams: ${backup.teams?.length || 0}`);
  console.log(`   - Projects: ${backup.projects?.length || 0}`);
  console.log(`   - Tasks: ${backup.tasks?.length || 0}`);
  console.log('');
  
  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.taskComment.deleteMany();
  await prisma.progressLog.deleteMany();
  await prisma.elementStatus.deleteMany();
  await prisma.elementTaskLink.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.elementProperty.deleteMany();
  await prisma.element.deleteMany();
  await prisma.model.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.projectUser.deleteMany();
  await prisma.project.deleteMany();
  await prisma.roleRequest.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  // Restore data
  console.log('📥 Restoring data...');
  
  if (backup.users?.length) {
    console.log(`   Restoring ${backup.users.length} users...`);
    for (const user of backup.users) {
      await prisma.user.create({ data: user });
    }
  }

  if (backup.teams?.length) {
    console.log(`   Restoring ${backup.teams.length} teams...`);
    for (const team of backup.teams) {
      await prisma.team.create({ data: team });
    }
  }

  if (backup.teamMemberships?.length) {
    console.log(`   Restoring ${backup.teamMemberships.length} team memberships...`);
    for (const membership of backup.teamMemberships) {
      await prisma.teamMembership.create({ data: membership });
    }
  }

  if (backup.projects?.length) {
    console.log(`   Restoring ${backup.projects.length} projects...`);
    for (const project of backup.projects) {
      await prisma.project.create({ data: project });
    }
  }

  if (backup.tasks?.length) {
    console.log(`   Restoring ${backup.tasks.length} tasks...`);
    for (const task of backup.tasks) {
      await prisma.task.create({ data: task });
    }
  }

  if (backup.models?.length) {
    console.log(`   Restoring ${backup.models.length} models...`);
    for (const model of backup.models) {
      await prisma.model.create({ data: model });
    }
  }

  if (backup.elements?.length) {
    console.log(`   Restoring ${backup.elements.length} elements...`);
    for (const element of backup.elements) {
      await prisma.element.create({ data: element });
    }
  }

  if (backup.dependencies?.length) {
    console.log(`   Restoring ${backup.dependencies.length} dependencies...`);
    for (const dependency of backup.dependencies) {
      await prisma.dependency.create({ data: dependency });
    }
  }

  console.log('');
  console.log('✅ Restore completed successfully!');
  console.log(`📅 Backup from: ${backup.timestamp}`);
}

restore()
  .catch((e) => {
    console.error('❌ Restore failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
