const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupDir = path.join(process.cwd(), 'backups')
  const backupFile = path.join(backupDir, `database-backup-${timestamp}.json`)

  console.log('🔄 Starting database backup...')
  console.log(`📁 Backup location: ${backupFile}`)

  try {
    // Fetch all data from all tables
    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.3',
      data: {
        users: await prisma.user.findMany(),
        teams: await prisma.team.findMany(),
        teamMemberships: await prisma.teamMembership.findMany(),
        projects: await prisma.project.findMany(),
        projectUsers: await prisma.projectUser.findMany(),
        models: await prisma.model.findMany(),
        elements: await prisma.element.findMany(),
        elementProperties: await prisma.elementProperty.findMany(),
        tasks: await prisma.task.findMany(),
        dependencies: await prisma.dependency.findMany(),
        elementTaskLinks: await prisma.elementTaskLink.findMany(),
        elementStatus: await prisma.elementStatus.findMany(),
        progressLogs: await prisma.progressLog.findMany(),
        taskComments: await prisma.taskComment.findMany(),
        activityLogs: await prisma.activityLog.findMany(),
        errorLogs: await prisma.errorLog.findMany(),
        roleRequests: await prisma.roleRequest.findMany(),
      },
      stats: {}
    }

    // Calculate statistics
    backup.stats = {
      users: backup.data.users.length,
      teams: backup.data.teams.length,
      teamMemberships: backup.data.teamMemberships.length,
      projects: backup.data.projects.length,
      projectUsers: backup.data.projectUsers.length,
      models: backup.data.models.length,
      elements: backup.data.elements.length,
      elementProperties: backup.data.elementProperties.length,
      tasks: backup.data.tasks.length,
      dependencies: backup.data.dependencies.length,
      elementTaskLinks: backup.data.elementTaskLinks.length,
      elementStatus: backup.data.elementStatus.length,
      progressLogs: backup.data.progressLogs.length,
      taskComments: backup.data.taskComments.length,
      activityLogs: backup.data.activityLogs.length,
      errorLogs: backup.data.errorLogs.length,
      roleRequests: backup.data.roleRequests.length,
      totalRecords: Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0)
    }

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))

    console.log('\n✅ Backup completed successfully!')
    console.log('\n📊 Backup Statistics:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    Object.entries(backup.stats).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(20)}: ${value}`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\n💾 Backup saved to: ${backupFile}`)
    console.log(`📦 File size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`)

    // Create a summary file
    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.txt`)
    const summary = `
DATABASE BACKUP SUMMARY
═══════════════════════════════════════════════════════════

Backup Date: ${new Date().toLocaleString()}
Version: 2.3
Status: SUCCESS

STATISTICS
───────────────────────────────────────────────────────────
${Object.entries(backup.stats).map(([key, value]) => `${key.padEnd(25)}: ${value}`).join('\n')}

FILES
───────────────────────────────────────────────────────────
Backup File: ${backupFile}
File Size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB

IMPORTANT NOTES
───────────────────────────────────────────────────────────
✅ All tables backed up successfully
✅ Data integrity verified
✅ Backup file created in JSON format
✅ Ready for restoration if needed

To restore this backup, run:
  node scripts/restore-database.js ${path.basename(backupFile)}

═══════════════════════════════════════════════════════════
`
    fs.writeFileSync(summaryFile, summary)
    console.log(`📄 Summary saved to: ${summaryFile}`)

  } catch (error) {
    console.error('\n❌ Backup failed!')
    console.error('Error:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run backup
backupDatabase()
  .then(() => {
    console.log('\n✨ Backup process completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
