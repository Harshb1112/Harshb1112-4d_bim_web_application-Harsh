import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScheduleHealthMetrics {
  overallScore: number;
  scheduleScore: number;
  costScore: number;
  resourceScore: number;
  spi: number;
  cpi: number;
  scheduleVariance: number;
  costVariance: number;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number;
}

export async function calculateScheduleHealth(projectId: number): Promise<ScheduleHealthMetrics> {
  // Fetch all necessary data
  const [tasks, resources, assignments, costs] = await Promise.all([
    prisma.task.findMany({
      where: { projectId },
      include: { resourceAssignments: true }
    }),
    prisma.resource.findMany({
      where: { projectId }
    }),
    prisma.resourceAssignment.findMany({
      where: { task: { projectId } },
      include: { resource: true, task: true }
    }),
    prisma.resourceCost.findMany({
      where: { resource: { projectId } }
    })
  ]);

  // Calculate Resource Score (0-100)
  const resourceScore = calculateResourceScore(resources, assignments, tasks);

  // Calculate Schedule Score based on task completion
  const scheduleScore = calculateScheduleScore(tasks);

  // Calculate Cost Score based on budget vs actual
  const costScore = calculateCostScore(costs, resources);

  // Calculate EVM metrics
  const evmMetrics = calculateEVMMetrics(tasks, costs, assignments);

  // Calculate Overall Score (weighted average)
  // ONLY use metrics that have real data
  let overallScore = 0;
  let totalWeight = 0;
  
  // Always include schedule if we have tasks
  if (tasks.length > 0) {
    overallScore += scheduleScore * 0.5;
    totalWeight += 0.5;
    console.log('  ✅ Using Schedule Score (50% weight)');
  }
  
  // Only include cost if we have actual cost data
  if (costs.length > 0) {
    overallScore += costScore * 0.3;
    totalWeight += 0.3;
    console.log('  ✅ Using Cost Score (30% weight)');
  } else {
    console.log('  ⚠️ No cost data - excluding from calculation');
  }
  
  // Only include resources if we have actual resource data
  if (resources.length > 0) {
    overallScore += resourceScore * 0.2;
    totalWeight += 0.2;
    console.log('  ✅ Using Resource Score (20% weight)');
  } else {
    console.log('  ⚠️ No resource data - excluding from calculation');
  }
  
  // Normalize to 100 scale based on available data
  if (totalWeight > 0) {
    overallScore = Math.round(overallScore / totalWeight);
  } else {
    overallScore = 0;
  }
  
  console.log('  📊 Final Overall Score:', overallScore, '(based on', totalWeight * 100, '% of data)');

  console.log('🔍 Health Calculation Debug:');
  console.log('  Tasks:', tasks.length);
  console.log('  Resources:', resources.length);
  console.log('  Assignments:', assignments.length);
  console.log('  Costs:', costs.length);
  console.log('  Schedule Score:', scheduleScore);
  console.log('  Cost Score:', costScore);
  console.log('  Resource Score:', resourceScore);
  console.log('  Overall Score:', overallScore);

  return {
    overallScore,
    scheduleScore,
    costScore: costs.length > 0 ? costScore : -1, // -1 means no data
    resourceScore: resources.length > 0 ? resourceScore : -1, // -1 means no data
    ...evmMetrics
  };
}

function calculateResourceScore(
  resources: any[],
  assignments: any[],
  tasks: any[]
): number {
  if (resources.length === 0) {
    // No resources configured - return -1 to indicate no data
    console.log('  ⚠️ No resources configured');
    return -1;
  }

  let totalScore = 0;
  let scoredResources = 0;

  for (const resource of resources) {
    const resourceAssignments = assignments.filter(a => a.resourceId === resource.id);
    
    if (resourceAssignments.length === 0) {
      // Unused resource - slightly negative impact
      totalScore += 60;
      scoredResources++;
      continue;
    }

    // Calculate utilization
    const capacity = resource.capacity || 100;
    let totalAllocated = 0;

    for (const assignment of resourceAssignments) {
      const task = tasks.find(t => t.id === assignment.taskId);
      if (!task) continue;

      // Check if task is active (between start and end date)
      const now = new Date();
      const taskStart = task.startDate ? new Date(task.startDate) : null;
      const taskEnd = task.endDate ? new Date(task.endDate) : null;

      if (taskStart && taskEnd && now >= taskStart && now <= taskEnd) {
        totalAllocated += assignment.quantity || 1;
      }
    }

    const utilizationPercent = (totalAllocated / capacity) * 100;

    // Score based on utilization
    let resourceScore = 0;
    if (utilizationPercent === 0) {
      resourceScore = 60; // Idle resource
    } else if (utilizationPercent > 0 && utilizationPercent <= 70) {
      resourceScore = 90; // Good utilization
    } else if (utilizationPercent > 70 && utilizationPercent <= 100) {
      resourceScore = 100; // Optimal utilization
    } else if (utilizationPercent > 100 && utilizationPercent <= 120) {
      resourceScore = 70; // Slightly over-allocated
    } else {
      resourceScore = 40; // Severely over-allocated
    }

    totalScore += resourceScore;
    scoredResources++;
  }

  return scoredResources > 0 ? Math.round(totalScore / scoredResources) : 0;
}

function calculateScheduleScore(tasks: any[]): number {
  console.log('📊 calculateScheduleScore called with', tasks.length, 'tasks');
  
  if (tasks.length === 0) {
    console.log('  ⚠️ No tasks, returning 0');
    return 0;
  }

  const now = new Date();
  let onTimeCount = 0;
  let delayedCount = 0;
  let completedCount = 0;

  for (const task of tasks) {
    const endDate = task.endDate ? new Date(task.endDate) : null;
    const progress = task.progress || 0;

    if (progress === 100) {
      completedCount++;
      // Check if completed on time
      if (endDate && task.actualEndDate) {
        const actualEnd = new Date(task.actualEndDate);
        if (actualEnd <= endDate) {
          onTimeCount++;
        } else {
          delayedCount++;
        }
      } else {
        onTimeCount++; // Assume on time if no actual end date
      }
    } else if (endDate && now > endDate) {
      // Task is overdue
      delayedCount++;
    } else {
      // Task is in progress or not started
      onTimeCount++;
    }
  }

  const totalEvaluated = onTimeCount + delayedCount;
  const scheduleScore = totalEvaluated > 0 ? Math.round((onTimeCount / totalEvaluated) * 100) : 0;
  
  console.log('  ✅ On Time:', onTimeCount);
  console.log('  ❌ Delayed:', delayedCount);
  console.log('  📈 Score:', scheduleScore);
  
  return scheduleScore;
}

function calculateCostScore(costs: any[], resources: any[]): number {
  if (costs.length === 0 && resources.length === 0) {
    // No cost data configured - return -1 to indicate no data
    console.log('  ⚠️ No cost data configured');
    return -1;
  }
  
  if (costs.length === 0) {
    // No costs recorded yet - return -1 to indicate no data
    console.log('  ⚠️ No costs recorded');
    return -1;
  }

  // Calculate total budget (sum of all resource rates * capacity)
  let totalBudget = 0;
  for (const resource of resources) {
    const rate = resource.dailyRate || resource.hourlyRate || 0;
    const capacity = resource.capacity || 1;
    totalBudget += rate * capacity;
  }

  // Calculate actual costs
  const totalActualCost = costs.reduce((sum, cost) => sum + cost.totalCost, 0);

  if (totalBudget === 0) return 0;

  const costPercent = (totalActualCost / totalBudget) * 100;

  // Score based on cost performance
  if (costPercent <= 80) return 100; // Under budget
  if (costPercent <= 100) return 90; // On budget
  if (costPercent <= 110) return 70; // Slightly over budget
  if (costPercent <= 120) return 50; // Over budget
  return 30; // Significantly over budget
}

function calculateEVMMetrics(tasks: any[], costs: any[], assignments: any[]) {
  const now = new Date();
  
  // Calculate BAC (Budget at Completion) - sum of all resource costs planned
  const bac = costs.reduce((sum, cost) => sum + cost.totalCost, 0);

  // Calculate PV (Planned Value) - what should have been done by now
  let pv = 0;
  for (const task of tasks) {
    const startDate = task.startDate ? new Date(task.startDate) : null;
    const endDate = task.endDate ? new Date(task.endDate) : null;

    if (startDate && endDate && now >= startDate) {
      // Find costs associated with this task's resources
      const taskAssignments = assignments.filter(a => a.taskId === task.id);
      const taskResourceIds = taskAssignments.map(a => a.resourceId);
      const taskCosts = costs.filter(c => taskResourceIds.includes(c.resourceId));
      const taskBudget = taskCosts.reduce((sum, c) => sum + c.totalCost, 0);

      if (now >= endDate) {
        pv += taskBudget; // Task should be complete
      } else {
        // Calculate planned progress based on time elapsed
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const plannedProgress = elapsed / totalDuration;
        pv += taskBudget * plannedProgress;
      }
    }
  }

  // Calculate EV (Earned Value) - actual work completed
  let ev = 0;
  for (const task of tasks) {
    const progress = (task.progress || 0) / 100;
    
    // Find costs associated with this task's resources
    const taskAssignments = assignments.filter(a => a.taskId === task.id);
    const taskResourceIds = taskAssignments.map(a => a.resourceId);
    const taskCosts = costs.filter(c => taskResourceIds.includes(c.resourceId));
    const taskBudget = taskCosts.reduce((sum, c) => sum + c.totalCost, 0);
    
    ev += taskBudget * progress;
  }

  // Calculate AC (Actual Cost)
  const ac = costs.reduce((sum, cost) => sum + cost.totalCost, 0);

  // Calculate derived metrics
  const spi = pv > 0 ? ev / pv : 0; // Schedule Performance Index
  const cpi = ac > 0 ? ev / ac : 0; // Cost Performance Index
  const scheduleVariance = ev - pv;
  const costVariance = ev - ac;

  // Calculate forecasts
  const eac = cpi > 0 ? bac / cpi : bac; // Estimate at Completion
  const etc = eac - ac; // Estimate to Complete
  const vac = bac - eac; // Variance at Completion
  const tcpi = (bac - ev) / (bac - ac) || 1; // To-Complete Performance Index

  return {
    spi: Math.max(0, spi),
    cpi: Math.max(0, cpi),
    scheduleVariance,
    costVariance,
    bac: Math.max(0, bac),
    pv: Math.max(0, pv),
    ev: Math.max(0, ev),
    ac: Math.max(0, ac),
    eac: Math.max(0, eac),
    etc: Math.max(0, etc),
    vac,
    tcpi: Math.max(0, tcpi)
  };
}
