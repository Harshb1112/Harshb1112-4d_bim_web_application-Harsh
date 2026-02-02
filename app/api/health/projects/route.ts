import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { calculateScheduleHealth } from '@/lib/schedule-health-calculator';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🏥 Fetching REAL health data for all projects...');

    // Fetch all projects user has access to - REAL DATABASE QUERY
    const projects = await prisma.project.findMany({
      where: user.role === 'admin' || user.role === 'manager'
        ? {} // Admin/Manager see all projects
        : {
            team: {
              members: {
                some: { userId: user.id }
              }
            }
          },
      select: {
        id: true,
        name: true,
        budget: true,
        totalBudget: true,
        contingencyPercentage: true,
        currency: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
            endDate: true,
            startDate: true
          }
        },
        _count: {
          select: {
            tasks: true,
            models: true
          }
        }
      }
    });

    console.log(`📊 Found ${projects.length} projects for user ${user.email}`);

    // Calculate REAL health for each project
    const projectsHealth = await Promise.all(
      projects.map(async (project) => {
        try {
          // REAL health calculation using actual task data
          const health = await calculateScheduleHealth(project.id);
          
          // REAL task statistics
          const tasksTotal = project.tasks.length;
          const tasksCompleted = project.tasks.filter(t => t.status === 'completed').length;
          const tasksInProgress = project.tasks.filter(t => t.status === 'in_progress').length;
          const tasksOverdue = project.tasks.filter(t => 
            t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed'
          ).length;

          // REAL cost calculations
          // Use totalBudget (new field) or fallback to budget (old field)
          let projectBudget = project.totalBudget || project.budget || 0;
          let totalActualCost = 0;

          try {
            // Get actual costs from resource costs table
            const resourceCosts = await prisma.resourceCost.findMany({
              where: {
                resource: {
                  projectId: project.id
                }
              },
              select: {
                totalCost: true
              }
            });

            totalActualCost = resourceCosts.reduce((sum, r) => sum + (r.totalCost || 0), 0);
          } catch (error) {
            console.warn(`Could not fetch costs for project ${project.id}`);
          }

          // REAL project dates
          const projectStartDate = project.startDate || project.createdAt;
          const projectEndDate = project.endDate;
          
          // REAL progress calculation
          const totalProgress = project.tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
          const avgProgress = tasksTotal > 0 ? Math.round(totalProgress / tasksTotal) : 0;

          console.log(`✅ Project "${project.name}": Health=${health.overallScore}, Tasks=${tasksCompleted}/${tasksTotal}`);

          return {
            id: project.id,
            name: project.name,
            overallScore: Math.round(health.overallScore),
            scheduleScore: Math.round(health.scheduleScore),
            costScore: Math.round(health.costScore),
            resourceScore: Math.round(health.resourceScore),
            spi: health.spi,
            cpi: health.cpi,
            tasksTotal,
            tasksCompleted,
            tasksInProgress,
            tasksOverdue,
            budget: projectBudget,
            totalBudget: projectBudget, // Add this for consistency
            contingencyPercentage: project.contingencyPercentage || 10,
            currency: project.currency || 'INR',
            spent: totalActualCost,
            startDate: projectStartDate?.toISOString(),
            endDate: projectEndDate?.toISOString(),
            progress: avgProgress,
            modelsCount: project._count.models
          };
        } catch (error) {
          console.error(`❌ Error calculating health for project ${project.id}:`, error);
          // Return basic data if health calculation fails
          return {
            id: project.id,
            name: project.name,
            overallScore: 0,
            scheduleScore: 0,
            costScore: 0,
            resourceScore: 0,
            spi: 0,
            cpi: 0,
            tasksTotal: project.tasks.length,
            tasksCompleted: project.tasks.filter(t => t.status === 'completed').length,
            tasksInProgress: project.tasks.filter(t => t.status === 'in_progress').length,
            tasksOverdue: 0,
            budget: project.totalBudget || project.budget || 0,
            totalBudget: project.totalBudget || project.budget || 0,
            contingencyPercentage: project.contingencyPercentage || 10,
            currency: project.currency || 'INR',
            spent: 0,
            startDate: project.createdAt.toISOString(),
            endDate: null,
            progress: 0,
            modelsCount: project._count.models
          };
        }
      })
    );

    console.log('✅ REAL health data calculated for all projects');

    return NextResponse.json({
      success: true,
      projects: projectsHealth,
      totalProjects: projectsHealth.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Health projects error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects health' },
      { status: 500 }
    );
  }
}
