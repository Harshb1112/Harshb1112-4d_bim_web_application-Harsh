const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the calculator (we'll simulate it here)
async function testHealthCalculation() {
  try {
    const projectId = 6; // Test project

    console.log('\n🧪 Testing Health Calculation for Project ID:', projectId);
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
    
    for (const task of tasks) {
      const startDate = task.startDate ? new Date(task.startDate) : null;
      const endDate = task.endDate ? new Date(task.endDate) : null;

      if (startDate && endDate) {
        if (now >= endDate) {
          totalPlannedProgress += 1;
        } else if (now >= startDate) {
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          const plannedProgress = Math.min(1, elapsed / totalDuration);
          totalPlannedProgress += plannedProgress;
        }
      } else {
        totalPlannedProgress += 1;
      }
    }
    
    const avgPlannedProgress = totalPlannedProgress / tasks.length;
    console.log('📅 Average Planned Progress:', (avgPlannedProgress * 100).toFixed(1), '%');

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
    console.log('  Schedule Variance:', scheduleVariance.toFixed(2));
    console.log('  Cost Variance:', costVariance.toFixed(2));

    const eac = cpi > 0 && cpi !== 1 ? bac / cpi : bac;
    const etc = Math.max(0, eac - ac);
    const vac = bac - eac;
    const tcpi = (bac - ev) > 0 && (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 1;

    console.log('\n🔮 Forecasts:');
    console.log('  EAC (Estimate at Completion):', eac.toFixed(2));
    console.log('  ETC (Estimate to Complete):', etc.toFixed(2));
    console.log('  VAC (Variance at Completion):', vac.toFixed(2));
    console.log('  TCPI (To-Complete Performance Index):', tcpi.toFixed(2));

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHealthCalculation();
