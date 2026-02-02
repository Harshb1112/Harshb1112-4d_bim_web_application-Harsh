const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHealthData() {
  try {
    // Get all projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true }
    });

    console.log('\n📊 Project Health Data Check\n');
    console.log('='.repeat(60));

    for (const project of projects) {
      console.log(`\n🏗️  Project: ${project.name} (ID: ${project.id})`);
      console.log('-'.repeat(60));

      // Check tasks
      const tasks = await prisma.task.findMany({
        where: { projectId: project.id },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          startDate: true,
          endDate: true
        }
      });

      console.log(`\n📋 Tasks: ${tasks.length}`);
      if (tasks.length > 0) {
        const completed = tasks.filter(t => t.status === 'completed').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const avgProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length;
        
        console.log(`   ✅ Completed: ${completed}`);
        console.log(`   🔄 In Progress: ${inProgress}`);
        console.log(`   📊 Average Progress: ${avgProgress.toFixed(1)}%`);
        
        // Show sample tasks
        console.log('\n   Sample Tasks:');
        tasks.slice(0, 3).forEach(t => {
          console.log(`   - ${t.name} (${t.status}, ${t.progress}%)`);
        });
      }

      // Check resources
      const resources = await prisma.resource.findMany({
        where: { projectId: project.id },
        select: {
          id: true,
          name: true,
          type: true,
          capacity: true,
          dailyRate: true,
          hourlyRate: true
        }
      });

      console.log(`\n👥 Resources: ${resources.length}`);
      if (resources.length > 0) {
        console.log('   Sample Resources:');
        resources.slice(0, 3).forEach(r => {
          const rate = r.dailyRate || r.hourlyRate || 0;
          console.log(`   - ${r.name} (${r.type}, Rate: $${rate})`);
        });
      }

      // Check resource costs
      const costs = await prisma.resourceCost.findMany({
        where: { resource: { projectId: project.id } },
        select: {
          id: true,
          totalCost: true,
          resource: { select: { name: true } }
        }
      });

      console.log(`\n💰 Resource Costs: ${costs.length}`);
      if (costs.length > 0) {
        const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
        console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
        console.log('   Sample Costs:');
        costs.slice(0, 3).forEach(c => {
          console.log(`   - ${c.resource.name}: $${c.totalCost.toFixed(2)}`);
        });
      }

      // Check resource assignments
      const assignments = await prisma.resourceAssignment.findMany({
        where: { task: { projectId: project.id } },
        select: {
          id: true,
          quantity: true,
          resource: { select: { name: true } },
          task: { select: { name: true } }
        }
      });

      console.log(`\n🔗 Resource Assignments: ${assignments.length}`);
      if (assignments.length > 0) {
        console.log('   Sample Assignments:');
        assignments.slice(0, 3).forEach(a => {
          console.log(`   - ${a.resource.name} → ${a.task.name} (Qty: ${a.quantity})`);
        });
      }

      // Check schedule health records
      const healthRecords = await prisma.scheduleHealth.findMany({
        where: { projectId: project.id },
        orderBy: { date: 'desc' },
        take: 1
      });

      console.log(`\n📈 Latest Health Record:`);
      if (healthRecords.length > 0) {
        const h = healthRecords[0];
        console.log(`   Overall Score: ${h.overallScore}`);
        console.log(`   SPI: ${h.spi.toFixed(2)}`);
        console.log(`   CPI: ${h.cpi.toFixed(2)}`);
        console.log(`   BAC: $${h.bac.toFixed(2)}`);
        console.log(`   Date: ${h.date.toISOString()}`);
      } else {
        console.log(`   No health records found`);
      }

      console.log('\n' + '='.repeat(60));
    }

    console.log('\n✅ Check complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHealthData();
