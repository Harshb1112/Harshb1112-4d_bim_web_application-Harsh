import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { unlink } from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    // Get file details
    const file = await prisma.projectFile.findUnique({
      where: { id: fileId },
      include: {
        project: {
          include: {
            projectUsers: true,
            createdBy: true
          }
        }
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check permissions - only project owner, admin, or file uploader can delete
    const isOwner = file.project.createdBy?.id === user.id;
    const isAdmin = user.role === 'admin';
    const isUploader = file.uploadedBy === user.id;
    const isProjectMember = file.project.projectUsers.some(pu => pu.userId === user.id);

    if (!isOwner && !isAdmin && !isUploader && !isProjectMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete physical file if it exists
    if (file.filePath) {
      const fullPath = path.join(process.cwd(), 'public', file.filePath);
      if (existsSync(fullPath)) {
        try {
          await unlink(fullPath);
          console.log('Deleted file:', fullPath);
        } catch (err) {
          console.error('Failed to delete physical file:', err);
          // Continue with database deletion even if file deletion fails
        }
      }
    }

    // Delete from database
    await prisma.projectFile.delete({
      where: { id: fileId }
    });

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
