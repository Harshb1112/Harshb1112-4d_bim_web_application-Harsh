const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTaskDates() {
  try {
    const projectId = 6;

    console.log('\n📅 Updating Task Dates for Project ID:', projectId);
    console.log('='.repeat(60));

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { id: 'asc' }
    });

    console.log(`\nFound ${tasks.length} tasks\n`);

    // Set realistic dates - project started 30 days ago, runs for 180 days
    const projectStart = new Date();
    projectStart.setDate(projectStart.getDate() - 30); // Started 30 days ago

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      // Each task is 30 days long, with 5 days overlap
      const startDate = new Date(projectStart);
      startDate.setDate(startDate.getDate() + (i * 25)); // 25 day intervals
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // 30 day duration

      await prisma.task.update({
        where: { id: task.id },
        data: {
          startDate,
          endDate
        }
      });

      console.log(`✅ ${task.name}`);
      console.log(`   Start: ${startDate.toISOString().split('T')[0]}`);
      console.log(`   End: ${endDate.toISOString().split('T')[0]}`);
      console.log(`   Progress: ${task.progress}%\n`);
    }

    console.log('='.repeat(60));
    console.log('✅ Task dates updated!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTaskDates();
