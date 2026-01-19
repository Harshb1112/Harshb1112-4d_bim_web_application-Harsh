import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    // Fetch complete project data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            predecessors: true,
            successors: true,
          }
        },
        models: true,
        resources: true,
        dailyLogs: true,
        safetyIncidents: true,
        toolboxTalks: true,
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create JSON backup
    const backupData = JSON.stringify(project, null, 2);
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_backup_${Date.now()}.json`;

    // Return JSON file as download
    return new NextResponse(backupData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(backupData).toString()
      }
    });
  } catch (error) {
    console.error('JSON download failed:', error);
    return NextResponse.json({ error: 'Failed to download JSON backup' }, { status: 500 });
  }
}
