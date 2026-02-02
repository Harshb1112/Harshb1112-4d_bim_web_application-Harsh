const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkArrowProject() {
  try {
    const projectId = 5; // Arrow (Restored)

    console.log('\n🏗️  Checking Arrow Project (ID: 5)');
    console.log('='.repeat(60));

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        budget: true
      }
    });

    console.log('\n📋 Project Details:');
    console.log('  Name:', project.name);
    console.log('  Status:', project.status);
    console.log('  Budget:', project.budget);
    console.log('  Start:', project.startDate?.toISOString().split('T')[0] || 'Not set');
    console.log('  End:', project.endDate?.toISOString().split('T')[0] || 'Not set');

    // Get tasks
    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true
      }
    });

    console.log('\n📋 Tasks:', tasks.length);
    tasks.forEach(task => {
      console.log(`\n  ${task.name}`);
      console.log(`    Status: ${task.status}`);
      console.log(`    Progress: ${task.progress}%`);
      console.log(`    Start: ${task.startDate?.toISOString().split('T')[0] || 'Not set'}`);
      console.log(`    End: ${task.endDate?.toISOString().split('T')[0] || 'Not set'}`);
    });

    // Get resources
    const resources = await prisma.resource.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        type: true,
        capacity: true,
        dailyRate: true,
        hourlyRate: true
      }
    });

    console.log('\n👥 Resources:', resources.length);
    if (resources.length === 0) {
      console.log('  ⚠️  No resources found!');
    } else {
      resources.forEach(r => {
        const rate = r.dailyRate || r.hourlyRate || 0;
        console.log(`  - ${r.name} (${r.type}, Rate: $${rate})`);
      });
    }

    // Get resource costs
    const costs = await prisma.resourceCost.findMany({
      where: { resource: { projectId } },
      select: {
        id: true,
        totalCost: true,
        resource: { select: { name: true } }
      }
    });

    console.log('\n💰 Resource Costs:', costs.length);
    if (costs.length === 0) {
      console.log('  ⚠️  No costs found!');
    } else {
      const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
      console.log(`  Total: $${totalCost.toFixed(2)}`);
      costs.forEach(c => {
        console.log(`  - ${c.resource.name}: $${c.totalCost.toFixed(2)}`);
      });
    }

    // Calculate what the metrics would be
    console.log('\n📊 Calculated Metrics:');
    
    if (costs.length === 0) {
      console.log('  ⚠️  Cannot calculate EVM metrics - no cost data!');
      console.log('\n💡 Recommendations:');
      console.log('  1. Add resources to the project');
      console.log('  2. Assign costs to resources');
      console.log('  3. Link resources to tasks');
    } else {
      const bac = costs.reduce((sum, c) => sum + c.totalCost, 0);
      const totalProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
      const avgProgress = tasks.length > 0 ? totalProgress / tasks.length / 100 : 0;
      
      console.log('  BAC:', bac.toFixed(2));
      console.log('  Average Progress:', (avgProgress * 100).toFixed(1), '%');
      console.log('  EV:', (bac * avgProgress).toFixed(2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkArrowProject();
