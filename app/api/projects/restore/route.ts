import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      console.error('[Restore] No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      console.error('[Restore] Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only admin and manager can restore backups
    if (user.role !== 'admin' && user.role !== 'manager') {
      console.error('[Restore] Insufficient permissions:', user.role);
      return NextResponse.json({ error: 'Only admin and manager can restore backups' }, { status: 403 });
    }

    const formData = await req.formData();
    const backupFile = formData.get('backupFile') as File;

    console.log('[Restore] Received file:', backupFile?.name, backupFile?.type, backupFile?.size);

    if (!backupFile) {
      console.error('[Restore] No backup file provided');
      return NextResponse.json({ error: 'Backup file is required' }, { status: 400 });
    }

    // Read JSON file
    const fileText = await backupFile.text();
    console.log('[Restore] File text length:', fileText.length);
    
    const projectData = JSON.parse(fileText);
    console.log('[Restore] Parsed project data:', projectData.name, projectData.id);

    // Validate JSON structure
    if (!projectData.name) {
      console.error('[Restore] Invalid backup format - no project name');
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Create new project with restored data
    const newProject = await prisma.project.create({
      data: {
        name: `${projectData.name} (Restored)`,
        description: projectData.description,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        status: projectData.status || 'active',
        createdById: user.id,
        // Don't set teamId and teamLeaderId if they don't exist
        teamId: projectData.teamId ? (await prisma.team.findUnique({ where: { id: projectData.teamId } }))?.id : null,
        teamLeaderId: projectData.teamLeaderId ? (await prisma.user.findUnique({ where: { id: projectData.teamLeaderId } }))?.id : null,
        location: projectData.location,
        latitude: projectData.latitude,
        longitude: projectData.longitude,
        budget: projectData.budget,
        aiEnabled: projectData.aiEnabled || false,
      }
    });

    // Restore tasks
    const taskIdMap = new Map<number, number>(); // old ID -> new ID
    
    if (projectData.tasks && projectData.tasks.length > 0) {
      // First pass: Create all tasks without dependencies
      for (const task of projectData.tasks) {
        const newTask = await prisma.task.create({
          data: {
            projectId: newProject.id,
            name: task.name,
            description: task.description,
            startDate: task.startDate ? new Date(task.startDate) : null,
            endDate: task.endDate ? new Date(task.endDate) : null,
            actualStartDate: task.actualStartDate ? new Date(task.actualStartDate) : null,
            actualEndDate: task.actualEndDate ? new Date(task.actualEndDate) : null,
            durationDays: task.durationDays,
            progress: task.progress || 0,
            color: task.color,
            resource: task.resource,
            // Don't set teamId and assigneeId if they don't exist
            teamId: task.teamId ? (await prisma.team.findUnique({ where: { id: task.teamId } }))?.id : null,
            assigneeId: task.assigneeId ? (await prisma.user.findUnique({ where: { id: task.assigneeId } }))?.id : null,
            status: task.status || 'todo',
            priority: task.priority,
          }
        });
        taskIdMap.set(task.id, newTask.id);
      }

      // Second pass: Create dependencies
      for (const task of projectData.tasks) {
        if (task.predecessors && task.predecessors.length > 0) {
          for (const dep of task.predecessors) {
            const newPredecessorId = taskIdMap.get(dep.predecessorId);
            const newSuccessorId = taskIdMap.get(task.id);
            
            if (newPredecessorId && newSuccessorId) {
              await prisma.dependency.create({
                data: {
                  predecessorId: newPredecessorId,
                  successorId: newSuccessorId,
                  type: dep.type || 'FS'
                }
              });
            }
          }
        }
      }
    }

    // Restore models (only metadata, not files)
    if (projectData.models && projectData.models.length > 0) {
      for (const model of projectData.models) {
        // Only restore Speckle and Autodesk models (URL-based)
        if (model.source !== 'local') {
          await prisma.model.create({
            data: {
              projectId: newProject.id,
              name: model.name,
              source: model.source,
              sourceUrl: model.sourceUrl,
              sourceId: model.sourceId,
              format: model.format,
              version: model.version || 1,
              metadata: model.metadata,
              uploadedBy: user.id,
            }
          });
        }
      }
    }

    // Restore resources
    if (projectData.resources && projectData.resources.length > 0) {
      for (const resource of projectData.resources) {
        await prisma.resource.create({
          data: {
            projectId: newProject.id,
            name: resource.name,
            type: resource.type,
            unit: resource.unit,
            hourlyRate: resource.hourlyRate,
            dailyRate: resource.dailyRate,
            capacity: resource.capacity,
            description: resource.description,
          }
        });
      }
    }

    // Restore daily logs
    if (projectData.dailyLogs && projectData.dailyLogs.length > 0) {
      for (const log of projectData.dailyLogs) {
        try {
          await prisma.dailyLog.create({
            data: {
              projectId: newProject.id,
              date: new Date(log.date),
              weather: log.weather,
              temperatureLow: log.temperatureLow,
              temperatureHigh: log.temperatureHigh,
              crewCount: log.crewCount,
              totalHours: log.totalHours,
              activities: log.activities,
              deliveries: log.deliveries,
              equipment: log.equipment,
              visitors: log.visitors,
              issues: log.issues,
              delays: log.delays,
              notes: log.notes,
              createdBy: user.id,
            }
          });
        } catch (err) {
          console.error('Failed to restore daily log:', err);
        }
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: newProject.id,
        action: 'PROJECT_RESTORED',
        details: {
          originalProjectName: projectData.name,
          restoredFrom: backupFile.name,
          tasksRestored: projectData.tasks?.length || 0,
          modelsRestored: projectData.models?.filter((m: any) => m.source !== 'local').length || 0,
          resourcesRestored: projectData.resources?.length || 0,
          dailyLogsRestored: projectData.dailyLogs?.length || 0,
        }
      }
    });

    return NextResponse.json({
      project: newProject,
      message: 'Project restored successfully',
      stats: {
        tasks: projectData.tasks?.length || 0,
        models: projectData.models?.filter((m: any) => m.source !== 'local').length || 0,
        resources: projectData.resources?.length || 0,
        dailyLogs: projectData.dailyLogs?.length || 0,
      }
    });

  } catch (error: any) {
    console.error('Restore failed:', error);
    return NextResponse.json({
      error: error.message || 'Failed to restore backup'
    }, { status: 500 });
  }
}
