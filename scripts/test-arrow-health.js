const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testArrowHealth() {
  try {
    const projectId = 5; // Arrow (Restored)

    console.log('\n🧪 Testing Health Calculation for Arrow Project');
    console.log('='.repeat(60));

    // Fetch data
    const [tasks, resources, costs] = await Promise.all([
      prisma.task.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          startDate: true,
          endDate: true
        }
      }),
      prisma.resource.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          type: true,
          capacity: true,
          dailyRate: true,
          hourlyRate: true
        }
      }),
      prisma.resourceCost.findMany({
        where: { resource: { projectId } },
        select: {
          id: true,
          totalCost: true
        }
      })
    ]);

    console.log('\n📊 Data Summary:');
    console.log('  Tasks:', tasks.length);
    console.log('  Resources:', resources.length);
    console.log('  Costs:', costs.length);

    // Calculate BAC
    const bac = costs.reduce((sum, cost) => sum + cost.totalCost, 0);
    console.log('\n💰 Budget at Completion (BAC):', bac.toFixed(2));

    // Calculate progress
    const totalProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    const avgProgress = totalProgress / tasks.length / 100;
    console.log('📈 Average Progress:', (avgProgress * 100).toFixed(1), '%');

    // Calculate planned progress
    const now = new Date();
    let totalPlannedProgress = 0;
    
    console.log('\n📅 Task Schedule Analysis:');
    for (const task of tasks) {
      const startDate = task.startDate ? new Date(task.startDate) : null;
      const endDate = task.endDate ? new Date(task.endDate) : null;

      let plannedProgress = 0;
      if (startDate && endDate) {
        if (now >= endDate) {
          plannedProgress = 1;
          console.log(`  ${task.name}: Should be 100% complete (past end date)`);
        } else if (now >= startDate) {
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          plannedProgress = Math.min(1, elapsed / totalDuration);
          console.log(`  ${task.name}: Should be ${(plannedProgress * 100).toFixed(1)}% complete`);
        } else {
          console.log(`  ${task.name}: Not started yet`);
        }
      } else {
        plannedProgress = 1;
        console.log(`  ${task.name}: No dates, assume should be complete`);
      }
      
      totalPlannedProgress += plannedProgress;
    }
    
    const avgPlannedProgress = totalPlannedProgress / tasks.length;
    console.log('\n📊 Average Planned Progress:', (avgPlannedProgress * 100).toFixed(1), '%');

    // Calculate EVM metrics
    const pv = bac * avgPlannedProgress;
    const ev = bac * avgProgress;
    const ac = bac * Math.min(1, avgProgress * 1.1);

    console.log('\n📊 EVM Metrics:');
    console.log('  PV (Planned Value):', pv.toFixed(2));
    console.log('  EV (Earned Value):', ev.toFixed(2));
    console.log('  AC (Actual Cost):', ac.toFixed(2));

    const spi = pv > 0 ? ev / pv : 0;
    const cpi = ac > 0 ? ev / ac : 0;
    const scheduleVariance = ev - pv;
    const costVariance = ev - ac;

    console.log('\n📈 Performance Indices:');
    console.log('  SPI:', spi.toFixed(2), spi >= 1 ? '✅ On/Ahead' : '⚠️ Behind');
    console.log('  CPI:', cpi.toFixed(2), cpi >= 1 ? '✅ On/Under Budget' : '⚠️ Over Budget');
    console.log('  Schedule Variance: $', scheduleVariance.toFixed(2));
    console.log('  Cost Variance: $', costVariance.toFixed(2));

    const eac = cpi > 0 && cpi !== 1 ? bac / cpi : bac;
    const etc = Math.max(0, eac - ac);
    const vac = bac - eac;
    const tcpi = (bac - ev) > 0 && (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 1;

    console.log('\n🔮 Forecasts:');
    console.log('  EAC (Estimate at Completion): $', eac.toFixed(2));
    console.log('  ETC (Estimate to Complete): $', etc.toFixed(2));
    console.log('  VAC (Variance at Completion): $', vac.toFixed(2));
    console.log('  TCPI (To-Complete Performance Index):', tcpi.toFixed(2));

    console.log('\n' + '='.repeat(60));
    
    // Interpretation
    console.log('\n💡 Interpretation:');
    if (spi >= 1 && cpi >= 1) {
      console.log('  ✅ Project is on track! Both schedule and cost are performing well.');
    } else if (spi < 1 && cpi < 1) {
      console.log('  ⚠️  Project is behind schedule AND over budget!');
    } else if (spi < 1) {
      console.log('  ⚠️  Project is behind schedule but cost is okay.');
    } else if (cpi < 1) {
      console.log('  ⚠️  Project is on schedule but over budget.');
    }

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testArrowHealth();
