import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir, stat } from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';

const prisma = new PrismaClient();
const MAX_BACKUP_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

export async function createAutoBackup(projectId: number) {
  console.log(`[AUTO-BACKUP] Starting backup for project ${projectId}`);
  
  try {
    // Fetch project with all data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            children: true,
            predecessors: true,
            successors: true,
            elementLinks: true,
            progressLogs: true,
            comments: true,
            resourceAssignments: {
              include: { resource: true }
            }
          }
        },
        models: {
          include: {
            elements: {
              include: {
                properties: true,
                elementStatus: true,
                taskLinks: true
              }
            }
          }
        },
        resources: {
          include: {
            assignments: true,
            costs: true
          }
        },
        dailyLogs: true,
        safetyIncidents: true,
        toolboxTalks: true,
        projectFiles: true,
        scheduleHealth: true,
        projectUsers: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true
              }
            }
          }
        },
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true
                  }
                }
              }
            }
          }
        },
        activityLogs: true,
        siteCameras: true,
        siteCaptures: true,
        dailySiteCosts: true,
        dailySiteProgress: true
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups', 'projects', projectId.toString());
    await mkdir(backupDir, { recursive: true });

    const timestamp = Date.now();
    const zipFileName = `auto-backup-${timestamp}.zip`;
    const zipFilePath = path.join(backupDir, zipFileName);

    // Create zip archive
    const output = createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    let totalSize = 0;

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Add project data JSON
    const projectData = JSON.stringify(project, null, 2);
    archive.append(projectData, { name: 'project-data.json' });

    // Add all IFC model files
    for (const model of project.models) {
      if (model.filePath && model.source === 'local') {
        try {
          const modelPath = path.join(process.cwd(), model.filePath);
          const stats = await stat(modelPath);
          totalSize += stats.size;

          if (totalSize > MAX_BACKUP_SIZE) {
            console.log(`[AUTO-BACKUP] Size limit reached, skipping remaining files`);
            break;
          }

          archive.file(modelPath, { name: `models/${path.basename(model.filePath)}` });
        } catch (err) {
          console.error(`[AUTO-BACKUP] Failed to add model: ${model.filePath}`, err);
        }
      }
    }

    // Add project files
    for (const file of project.projectFiles) {
      try {
        const filePath = path.join(process.cwd(), file.filePath);
        const stats = await stat(filePath);
        totalSize += stats.size;

        if (totalSize > MAX_BACKUP_SIZE) break;

        archive.file(filePath, { name: `files/${file.fileName}` });
      } catch (err) {
        console.error(`[AUTO-BACKUP] Failed to add file: ${file.filePath}`, err);
      }
    }

    // Add site captures
    for (const capture of project.siteCaptures) {
      try {
        const capturePath = path.join(process.cwd(), 'public', capture.url);
        const stats = await stat(capturePath);
        totalSize += stats.size;

        if (totalSize > MAX_BACKUP_SIZE) break;

        archive.file(capturePath, { name: `site-captures/${path.basename(capture.url)}` });
      } catch (err) {
        console.error(`[AUTO-BACKUP] Failed to add capture: ${capture.url}`, err);
      }
    }

    // Add README
    const readme = `
AUTOMATIC PROJECT BACKUP
========================

Project: ${project.name}
Backup Date: ${new Date().toLocaleString()}
Type: Automatic Backup
Frequency: Every ${project.autoBackupFrequency} hours

This backup was created automatically by the system.

Contents:
- project-data.json: Complete project database export
- models/: All 3D model files (IFC, etc.)
- files/: All project documents (PDF, Excel, etc.)
- site-captures/: All site photos and videos

Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB
`;
    archive.append(readme, { name: 'README.txt' });

    // Finalize
    await archive.finalize();

    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', reject);
    });

    const finalStats = await stat(zipFilePath);
    const finalSize = finalStats.size;

    // Save backup record
    const backup = await prisma.projectBackup.create({
      data: {
        projectId,
        name: `Auto Backup ${new Date().toLocaleString()}`,
        description: `Automatic backup created every ${project.autoBackupFrequency} hours (${(finalSize / (1024 * 1024)).toFixed(2)} MB)`,
        filePath: `/backups/projects/${projectId}/${zipFileName}`,
        fileSize: finalSize,
        isAutomatic: true,
        createdBy: project.createdById || 1
      }
    });

    // Update last backup time
    await prisma.project.update({
      where: { id: projectId },
      data: { lastAutoBackup: new Date() }
    });

    console.log(`[AUTO-BACKUP] Completed for project ${projectId}. Size: ${(finalSize / (1024 * 1024)).toFixed(2)} MB`);

    return {
      success: true,
      backupId: backup.id,
      size: finalSize
    };
  } catch (error: any) {
    console.error(`[AUTO-BACKUP] Failed for project ${projectId}:`, error);
    throw error;
  }
}

export async function runAutoBackupScheduler() {
  console.log('[AUTO-BACKUP SCHEDULER] Running...');
  
  try {
    // Find all projects with auto-backup enabled
    const projects = await prisma.project.findMany({
      where: {
        autoBackupEnabled: true,
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        autoBackupFrequency: true,
        lastAutoBackup: true
      }
    });

    console.log(`[AUTO-BACKUP SCHEDULER] Found ${projects.length} projects with auto-backup enabled`);

    for (const project of projects) {
      const now = new Date();
      const frequencyMs = project.autoBackupFrequency * 60 * 60 * 1000; // hours to milliseconds
      
      // Check if backup is due
      if (!project.lastAutoBackup || (now.getTime() - project.lastAutoBackup.getTime()) >= frequencyMs) {
        console.log(`[AUTO-BACKUP SCHEDULER] Creating backup for project ${project.id} (${project.name})`);
        
        try {
          await createAutoBackup(project.id);
        } catch (error) {
          console.error(`[AUTO-BACKUP SCHEDULER] Failed for project ${project.id}:`, error);
        }
      } else {
        const nextBackup = new Date(project.lastAutoBackup.getTime() + frequencyMs);
        console.log(`[AUTO-BACKUP SCHEDULER] Project ${project.id} next backup at ${nextBackup.toLocaleString()}`);
      }
    }

    console.log('[AUTO-BACKUP SCHEDULER] Completed');
  } catch (error) {
    console.error('[AUTO-BACKUP SCHEDULER] Error:', error);
  }
}
