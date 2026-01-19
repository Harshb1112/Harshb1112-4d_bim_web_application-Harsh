import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { readFile } from 'fs/promises';
import * as path from 'path';

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
    const backupId = parseInt(id);

    // Get backup record
    const backup = await prisma.projectBackup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Read the backup file
    const filePath = path.join(process.cwd(), backup.filePath);
    const fileBuffer = await readFile(filePath);

    // Return file as download
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backup.name.replace(/[^a-z0-9]/gi, '_')}.zip"`,
        'Content-Length': backup.fileSize.toString()
      }
    });
  } catch (error) {
    console.error('Download failed:', error);
    return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 });
  }
}
