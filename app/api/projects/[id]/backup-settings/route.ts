import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        autoBackupEnabled: true,
        autoBackupFrequency: true,
        lastAutoBackup: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    const { autoBackupEnabled, autoBackupFrequency } = await req.json();

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        autoBackupEnabled,
        autoBackupFrequency: parseInt(autoBackupFrequency)
      }
    });

    return NextResponse.json({
      message: 'Auto-backup settings updated',
      settings: {
        autoBackupEnabled: project.autoBackupEnabled,
        autoBackupFrequency: project.autoBackupFrequency
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
