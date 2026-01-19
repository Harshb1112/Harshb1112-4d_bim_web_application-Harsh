import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { writeFile, mkdir, readFile, copyFile, stat } from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { promisify } from 'util';
import { pipeline } from 'stream';

const prisma = new PrismaClient();
const pipelineAsync = promisify(pipeline);

// Max backup size: 5GB
const MAX_BACKUP_SIZE = 5 * 1024 * 1024 * 1024;

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const backups = await prisma.projectBackup.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(backups);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { projectId, name, description } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Fetch ALL project data with ALL relations
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
              include: {
                resource: true
              }
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
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups', 'projects', projectId.toString());
    await mkdir(backupDir, { recursive: true });

    const timestamp = Date.now();
    const zipFileName = `backup-${timestamp}.zip`;
    const zipFilePath = path.join(backupDir, zipFileName);

    // Create zip archive
    const output = createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    let totalSize = 0;

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // 1. Add project data JSON
    const projectData = JSON.stringify(project, null, 2);
    archive.append(projectData, { name: 'project-data.json' });

    // 2. Add all IFC model files
    for (const model of project.models) {
      if (model.filePath && model.source === 'local') {
        try {
          const modelPath = path.join(process.cwd(), model.filePath);
          const stats = await stat(modelPath);
          totalSize += stats.size;

          if (totalSize > MAX_BACKUP_SIZE) {
            throw new Error('Backup size exceeds 5GB limit');
          }

          archive.file(modelPath, { name: `models/${path.basename(model.filePath)}` });
        } catch (err) {
          console.error(`Failed to add model file: ${model.filePath}`, err);
        }
      }
    }

    // 3. Add all project files (PDFs, Excel, etc.)
    for (const file of project.projectFiles) {
      try {
        const filePath = path.join(process.cwd(), file.filePath);
        const stats = await stat(filePath);
        totalSize += stats.size;

        if (totalSize > MAX_BACKUP_SIZE) {
          throw new Error('Backup size exceeds 5GB limit');
        }

        archive.file(filePath, { name: `files/${file.fileName}` });
      } catch (err) {
        console.error(`Failed to add project file: ${file.filePath}`, err);
      }
    }

    // 4. Add site captures (photos/videos)
    for (const capture of project.siteCaptures) {
      try {
        const capturePath = path.join(process.cwd(), 'public', capture.url);
        const stats = await stat(capturePath);
        totalSize += stats.size;

        if (totalSize > MAX_BACKUP_SIZE) {
          throw new Error('Backup size exceeds 5GB limit');
        }

        archive.file(capturePath, { name: `site-captures/${path.basename(capture.url)}` });
      } catch (err) {
        console.error(`Failed to add site capture: ${capture.url}`, err);
      }
    }

    // 5. Add README with backup info
    const readme = `
PROJECT BACKUP
==============

Project: ${project.name}
Backup Date: ${new Date().toLocaleString()}
Created By: ${user.fullName} (${user.email})

Contents:
- project-data.json: Complete project database export
- models/: All 3D model files (IFC, etc.)
- files/: All project documents (PDF, Excel, etc.)
- site-captures/: All site photos and videos

Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB

To restore:
1. Extract this ZIP file
2. Use the restore API endpoint
3. All data and files will be restored

Note: This backup includes EVERYTHING - database records, files, models, images.
`;
    archive.append(readme, { name: 'README.txt' });

    // Finalize the archive
    await archive.finalize();

    // Wait for the output stream to finish
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', reject);
    });

    // Get final file size
    const finalStats = await stat(zipFilePath);
    const finalSize = finalStats.size;

    // Save backup record to database
    const backup = await prisma.projectBackup.create({
      data: {
        projectId,
        name: name || `Full Backup ${new Date().toLocaleString()}`,
        description: description || `Complete project backup including all files, models, and data (${(finalSize / (1024 * 1024)).toFixed(2)} MB)`,
        filePath: `/backups/projects/${projectId}/${zipFileName}`,
        fileSize: finalSize,
        createdBy: user.id
      }
    });

    return NextResponse.json({
      ...backup,
      message: `Backup created successfully! Size: ${(finalSize / (1024 * 1024)).toFixed(2)} MB`,
      includes: {
        tasks: project.tasks.length,
        models: project.models.length,
        files: project.projectFiles.length,
        dailyLogs: project.dailyLogs.length,
        safetyIncidents: project.safetyIncidents.length,
        siteCaptures: project.siteCaptures.length
      }
    });
  } catch (error: any) {
    console.error('Backup creation failed:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create backup' 
    }, { status: 500 });
  }
}
