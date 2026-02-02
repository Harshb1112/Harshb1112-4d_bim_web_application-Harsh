const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addArrowResources() {
  try {
    const projectId = 5; // Arrow (Restored)

    console.log('\n🏗️  Adding Resources to Arrow Project');
    console.log('='.repeat(60));

    // Add resources
    const resources = [
      {
        name: 'BIM Coordinator',
        type: 'labor',
        capacity: 1,
        dailyRate: 800,
        projectId
      },
      {
        name: 'Revit Specialist',
        type: 'labor',
        capacity: 1,
        dailyRate: 600,
        projectId
      },
      {
        name: 'CAD Technician',
        type: 'labor',
        capacity: 2,
        dailyRate: 400,
        projectId
      },
      {
        name: 'Workstation License',
        type: 'equipment',
        capacity: 3,
        dailyRate: 50,
        projectId
      }
    ];

    console.log('\n📦 Creating Resources...\n');

    for (const resourceData of resources) {
      const resource = await prisma.resource.create({
        data: resourceData
      });

      console.log(`✅ ${resource.name} (${resource.type})`);
      console.log(`   Rate: $${resource.dailyRate}/day`);
      console.log(`   Capacity: ${resource.capacity}`);

      // Calculate cost based on project duration
      // Project runs from 2024-09-08 to 2026-02-27 (approx 540 days)
      // But let's use actual work days (assume 30% complete for first task)
      const workDays = resource.type === 'labor' ? 100 : 150; // Different durations
      const totalCost = resource.dailyRate * workDays * resource.capacity;

      // Create resource cost
      await prisma.resourceCost.create({
        data: {
          resourceId: resource.id,
          totalCost,
          unitCost: resource.dailyRate,
          quantity: workDays * resource.capacity,
          date: new Date()
        }
      });

      console.log(`   Total Cost: $${totalCost.toFixed(2)}\n`);
    }

    // Calculate total budget
    const allCosts = await prisma.resourceCost.findMany({
      where: { resource: { projectId } }
    });

    const totalBudget = allCosts.reduce((sum, c) => sum + c.totalCost, 0);

    console.log('='.repeat(60));
    console.log(`💰 Total Project Budget: $${totalBudget.toFixed(2)}`);
    console.log('='.repeat(60));

    // Update project budget
    await prisma.project.update({
      where: { id: projectId },
      data: { budget: totalBudget }
    });

    console.log('✅ Resources and costs added successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addArrowResources();
