import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

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

    console.log('📊 Fetching REAL analytics data...');

    // Get all projects user has access to
    const projects = await prisma.project.findMany({
      where: user.role === 'admin' || user.role === 'manager'
        ? {}
        : {
            team: {
              members: {
                some: { userId: user.id }
              }
            }
          },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
            endDate: true,
            startDate: true,
            priority: true,
            durationDays: true
          }
        },
        models: {
          select: {
            id: true,
            source: true
          }
        },
        team: {
          include: {
            members: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Analyzing ${projects.length} projects...`);

    // REAL Task Statistics
    const allTasks = projects.flatMap(p => p.tasks);
    const taskStats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      pending: allTasks.filter(t => t.status === 'todo').length,
      overdue: allTasks.filter(t => 
        t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed'
      ).length,
      highPriority: allTasks.filter(t => t.priority === 'high').length,
      mediumPriority: allTasks.filter(t => t.priority === 'medium').length,
      lowPriority: allTasks.filter(t => t.priority === 'low').length
    };

    // REAL Budget Statistics (using ResourceAssignment for cost data)
    const budgetStats = {
      totalEstimated: 0,
      totalActual: 0,
      variance: 0
    };

    // Get real cost data from ResourceAssignment table
    try {
      const resourceAssignments = await prisma.resourceAssignment.findMany({
        where: {
          task: {
            projectId: {
              in: projects.map(p => p.id)
            }
          }
        },
        select: {
          estimatedCost: true,
          actualCost: true
        }
      });

      budgetStats.totalEstimated = resourceAssignments.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
      budgetStats.totalActual = resourceAssignments.reduce((sum, r) => sum + (r.actualCost || 0), 0);
      budgetStats.variance = budgetStats.totalEstimated - budgetStats.totalActual;
    } catch (error) {
      console.warn('Could not fetch resource assignment costs:', error);
    }

    // REAL Model Statistics
    const modelStats = {
      total: projects.reduce((sum, p) => sum + p.models.length, 0),
      bySource: {
        ifc: projects.reduce((sum, p) => sum + p.models.filter(m => m.source === 'local_ifc').length, 0),
        speckle: projects.reduce((sum, p) => sum + p.models.filter(m => m.source === 'speckle').length, 0),
        autodesk: projects.reduce((sum, p) => sum + p.models.filter(m => m.source === 'autodesk_acc' || m.source === 'autodesk_drive').length, 0)
      }
    };

    // REAL Team Statistics
    const uniqueUsers = new Set(projects.flatMap(p => p.team?.members.map(m => m.userId) || []));
    const teamStats = {
      totalMembers: uniqueUsers.size,
      totalTeams: projects.filter(p => p.team).length,
      avgTeamSize: projects.filter(p => p.team).length > 0 
        ? Math.round(uniqueUsers.size / projects.filter(p => p.team).length)
        : 0
    };

    // REAL Project Timeline Statistics
    const now = new Date();
    const timelineStats = {
      activeProjects: projects.filter(p => 
        p.startDate && new Date(p.startDate) <= now && 
        (!p.endDate || new Date(p.endDate) >= now)
      ).length,
      upcomingProjects: projects.filter(p => 
        p.startDate && new Date(p.startDate) > now
      ).length,
      completedProjects: projects.filter(p => 
        p.endDate && new Date(p.endDate) < now
      ).length,
      overdueProjects: projects.filter(p => 
        p.endDate && new Date(p.endDate) < now && 
        p.tasks.some(t => t.status !== 'completed')
      ).length
    };

    // REAL Upcoming Deadlines (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingDeadlines = projects
      .filter(p => p.endDate && new Date(p.endDate) >= now && new Date(p.endDate) <= thirtyDaysFromNow)
      .map(p => ({
        projectId: p.id,
        projectName: p.name,
        endDate: p.endDate,
        daysRemaining: Math.ceil((new Date(p.endDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        tasksRemaining: p.tasks.filter(t => t.status !== 'completed').length
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // REAL Activity Statistics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = {
      tasksCompleted: allTasks.filter(t => 
        t.status === 'completed' && 
        t.endDate && 
        new Date(t.endDate) >= sevenDaysAgo
      ).length,
      tasksCreated: allTasks.filter(t => 
        t.startDate && 
        new Date(t.startDate) >= sevenDaysAgo
      ).length
    };

    // REAL Performance Metrics
    const performanceMetrics = {
      completionRate: taskStats.total > 0 
        ? Math.round((taskStats.completed / taskStats.total) * 100) 
        : 0,
      onTimeRate: taskStats.completed > 0
        ? Math.round(((taskStats.completed - taskStats.overdue) / taskStats.completed) * 100)
        : 0,
      budgetEfficiency: budgetStats.totalEstimated > 0
        ? Math.round((budgetStats.totalActual / budgetStats.totalEstimated) * 100)
        : 0
    };

    console.log('✅ REAL analytics data calculated');

    return NextResponse.json({
      success: true,
      analytics: {
        tasks: taskStats,
        budget: budgetStats,
        models: modelStats,
        team: teamStats,
        timeline: timelineStats,
        upcomingDeadlines,
        recentActivity,
        performance: performanceMetrics
      },
      metadata: {
        totalProjects: projects.length,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userRole: user.role
      }
    });

  } catch (error: any) {
    console.error('❌ Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
