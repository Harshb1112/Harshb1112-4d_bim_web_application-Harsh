const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function restoreDatabase(backupFileName) {
  const backupFile = path.join(process.cwd(), 'backups', backupFileName)

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`)
    process.exit(1)
  }

  console.log('🔄 Starting database restore...')
  console.log(`📁 Restoring from: ${backupFile}`)

  try {
    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
    
    console.log(`\n📅 Backup created: ${backupData.timestamp}`)
    console.log(`📦 Version: ${backupData.version}`)
    console.log(`📊 Total records: ${backupData.stats.totalRecords}`)

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will DELETE all existing data and restore from backup!')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('\n🗑️  Deleting existing data...')

    // Delete in reverse order to respect foreign key constraints
    await prisma.roleRequest.deleteMany()
    await prisma.errorLog.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.taskComment.deleteMany()
    await prisma.progressLog.deleteMany()
    await prisma.elementStatus.deleteMany()
    await prisma.elementTaskLink.deleteMany()
    await prisma.dependency.deleteMany()
    await prisma.task.deleteMany()
    await prisma.elementProperty.deleteMany()
    await prisma.element.deleteMany()
    await prisma.model.deleteMany()
    await prisma.projectUser.deleteMany()
    await prisma.project.deleteMany()
    await prisma.teamMembership.deleteMany()
    await prisma.team.deleteMany()
    await prisma.user.deleteMany()

    console.log('✅ Existing data deleted')

    console.log('\n📥 Restoring data...')

    // Restore in correct order
    if (backupData.data.users.length > 0) {
      await prisma.user.createMany({ data: backupData.data.users })
      console.log(`  ✓ Users: ${backupData.data.users.length}`)
    }

    if (backupData.data.teams.length > 0) {
      await prisma.team.createMany({ data: backupData.data.teams })
      console.log(`  ✓ Teams: ${backupData.data.teams.length}`)
    }

    if (backupData.data.teamMemberships.length > 0) {
      await prisma.teamMembership.createMany({ data: backupData.data.teamMemberships })
      console.log(`  ✓ Team Memberships: ${backupData.data.teamMemberships.length}`)
    }

    if (backupData.data.projects.length > 0) {
      await prisma.project.createMany({ data: backupData.data.projects })
      console.log(`  ✓ Projects: ${backupData.data.projects.length}`)
    }

    if (backupData.data.projectUsers.length > 0) {
      await prisma.projectUser.createMany({ data: backupData.data.projectUsers })
      console.log(`  ✓ Project Users: ${backupData.data.projectUsers.length}`)
    }

    if (backupData.data.models.length > 0) {
      await prisma.model.createMany({ data: backupData.data.models })
      console.log(`  ✓ Models: ${backupData.data.models.length}`)
    }

    if (backupData.data.elements.length > 0) {
      await prisma.element.createMany({ data: backupData.data.elements })
      console.log(`  ✓ Elements: ${backupData.data.elements.length}`)
    }

    if (backupData.data.elementProperties.length > 0) {
      await prisma.elementProperty.createMany({ data: backupData.data.elementProperties })
      console.log(`  ✓ Element Properties: ${backupData.data.elementProperties.length}`)
    }

    if (backupData.data.tasks.length > 0) {
      await prisma.task.createMany({ data: backupData.data.tasks })
      console.log(`  ✓ Tasks: ${backupData.data.tasks.length}`)
    }

    if (backupData.data.dependencies.length > 0) {
      await prisma.dependency.createMany({ data: backupData.data.dependencies })
      console.log(`  ✓ Dependencies: ${backupData.data.dependencies.length}`)
    }

    if (backupData.data.elementTaskLinks.length > 0) {
      await prisma.elementTaskLink.createMany({ data: backupData.data.elementTaskLinks })
      console.log(`  ✓ Element Task Links: ${backupData.data.elementTaskLinks.length}`)
    }

    if (backupData.data.elementStatus.length > 0) {
      await prisma.elementStatus.createMany({ data: backupData.data.elementStatus })
      console.log(`  ✓ Element Status: ${backupData.data.elementStatus.length}`)
    }

    if (backupData.data.progressLogs.length > 0) {
      await prisma.progressLog.createMany({ data: backupData.data.progressLogs })
      console.log(`  ✓ Progress Logs: ${backupData.data.progressLogs.length}`)
    }

    if (backupData.data.taskComments.length > 0) {
      await prisma.taskComment.createMany({ data: backupData.data.taskComments })
      console.log(`  ✓ Task Comments: ${backupData.data.taskComments.length}`)
    }

    if (backupData.data.activityLogs.length > 0) {
      await prisma.activityLog.createMany({ data: backupData.data.activityLogs })
      console.log(`  ✓ Activity Logs: ${backupData.data.activityLogs.length}`)
    }

    if (backupData.data.errorLogs.length > 0) {
      await prisma.errorLog.createMany({ data: backupData.data.errorLogs })
      console.log(`  ✓ Error Logs: ${backupData.data.errorLogs.length}`)
    }

    if (backupData.data.roleRequests.length > 0) {
      await prisma.roleRequest.createMany({ data: backupData.data.roleRequests })
      console.log(`  ✓ Role Requests: ${backupData.data.roleRequests.length}`)
    }

    console.log('\n✅ Database restored successfully!')
    console.log(`📊 Total records restored: ${backupData.stats.totalRecords}`)

  } catch (error) {
    console.error('\n❌ Restore failed!')
    console.error('Error:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get backup file from command line argument
const backupFileName = process.argv[2]

if (!backupFileName) {
  console.error('❌ Please provide backup file name')
  console.error('Usage: node scripts/restore-database.js <backup-file-name>')
  console.error('\nExample: node scripts/restore-database.js database-backup-2025-11-26T04-48-05.json')
  process.exit(1)
}

// Run restore
restoreDatabase(backupFileName)
  .then(() => {
    console.log('\n✨ Restore process completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
