// Script to add sample resources and costs to a project
// Run: node scripts/add-sample-resources.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSampleResources() {
  try {
    console.log('🚀 Adding sample resources and costs...');

    // Get first project (you can change this to your project ID)
    const project = await prisma.project.findFirst();
    
    if (!project) {
      console.log('❌ No project found. Create a project first.');
      return;
    }

    console.log(`📁 Adding resources to project: ${project.name} (ID: ${project.id})`);

    // Add Resources
    const resources = await Promise.all([
      prisma.resource.create({
        data: {
          projectId: project.id,
          name: 'Construction Workers',
          type: 'Labor',
          unit: 'person',
          hourlyRate: 25.0,
          dailyRate: 200.0,
          capacity: 10,
          description: 'General construction workers'
        }
      }),
      prisma.resource.create({
        data: {
          projectId: project.id,
          name: 'Crane Operator',
          type: 'Labor',
          unit: 'person',
          hourlyRate: 45.0,
          dailyRate: 360.0,
          capacity: 2,
          description: 'Certified crane operators'
        }
      }),
      prisma.resource.create({
        data: {
          projectId: project.id,
          name: 'Excavator',
          type: 'Equipment',
          unit: 'unit',
          hourlyRate: 150.0,
          dailyRate: 1200.0,
          capacity: 1,
          description: 'Heavy excavation equipment'
        }
      }),
      prisma.resource.create({
        data: {
          projectId: project.id,
          name: 'Concrete Mixer',
          type: 'Equipment',
          unit: 'unit',
          hourlyRate: 50.0,
          dailyRate: 400.0,
          capacity: 2,
          description: 'Concrete mixing equipment'
        }
      }),
      prisma.resource.create({
        data: {
          projectId: project.id,
          name: 'Steel Rebar',
          type: 'Material',
          unit: 'ton',
          hourlyRate: null,
          dailyRate: null,
          capacity: 100,
          description: 'Reinforcement steel bars'
        }
      })
    ]);

    console.log(`✅ Created ${resources.length} resources`);

    // Get some tasks from the project
    const tasks = await prisma.task.findMany({
      where: { projectId: project.id },
      take: 5
    });

    if (tasks.length === 0) {
      console.log('⚠️ No tasks found. Skipping resource assignments.');
    } else {
      console.log(`📋 Found ${tasks.length} tasks for assignments`);

      // Add Resource Assignments
      const assignments = [];
      for (let i = 0; i < Math.min(tasks.length, 3); i++) {
        const task = tasks[i];
        const resource = resources[i % resources.length];

        const assignment = await prisma.resourceAssignment.create({
          data: {
            resourceId: resource.id,
            taskId: task.id,
            quantity: 2,
            startDate: task.startDate,
            endDate: task.endDate,
            hoursPerDay: 8,
            status: 'active'
          }
        });
        assignments.push(assignment);
      }

      console.log(`✅ Created ${assignments.length} resource assignments`);
    }

    // Add Resource Costs
    const costs = [];
    const today = new Date();
    
    for (const resource of resources) {
      // Add costs for last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const hours = resource.type === 'Labor' ? 8 : 4;
        const quantity = resource.type === 'Material' ? 0.5 : 1;
        const unitCost = resource.hourlyRate || resource.dailyRate || 100;
        const totalCost = resource.type === 'Material' 
          ? quantity * unitCost 
          : hours * unitCost;

        const cost = await prisma.resourceCost.create({
          data: {
            resourceId: resource.id,
            date: date,
            hours: resource.type !== 'Material' ? hours : null,
            quantity: quantity,
            unitCost: unitCost,
            totalCost: totalCost,
            notes: `Daily cost for ${resource.name}`
          }
        });
        costs.push(cost);
      }
    }

    console.log(`✅ Created ${costs.length} resource cost records`);

    // Calculate totals
    const totalBudget = resources.reduce((sum, r) => {
      const rate = r.dailyRate || r.hourlyRate || 0;
      return sum + (rate * (r.capacity || 1));
    }, 0);

    const totalActualCost = costs.reduce((sum, c) => sum + c.totalCost, 0);

    console.log('\n📊 Summary:');
    console.log(`   Resources: ${resources.length}`);
    console.log(`   Assignments: ${assignments.length}`);
    console.log(`   Cost Records: ${costs.length}`);
    console.log(`   Total Budget: $${totalBudget.toFixed(2)}`);
    console.log(`   Total Actual Cost: $${totalActualCost.toFixed(2)}`);
    console.log(`   Budget Variance: $${(totalBudget - totalActualCost).toFixed(2)}`);

    console.log('\n✅ Sample resources and costs added successfully!');
    console.log('🔄 Refresh your health dashboard to see the updated scores.');

  } catch (error) {
    console.error('❌ Error adding resources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleResources();
