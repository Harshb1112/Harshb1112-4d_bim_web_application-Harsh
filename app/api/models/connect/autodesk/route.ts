import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import AutodeskClient from '@/lib/autodesk-client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      accessToken,
      fileId,
      fileName,
      fileSize,
      autodeskProjectId,
      source, // 'autodesk_acc' or 'autodesk_drive'
    } = await request.json();

    if (!projectId || !accessToken || !fileId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Download file from Autodesk
    const client = new AutodeskClient();
    client.setAccessToken(accessToken);

    const fileBuffer = await client.downloadFile(autodeskProjectId, fileId);

    // Save file locally
    const uploadsDir = join(process.cwd(), 'uploads', 'autodesk');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');
    const filePath = join(uploadsDir, `${timestamp}_${safeFileName}`);

    await writeFile(filePath, fileBuffer);

    // Determine format from file extension
    const format = fileName.split('.').pop()?.toLowerCase() || 'unknown';

    // Create model record
    const model = await prisma.model.create({
      data: {
        projectId,
        name: fileName,
        source: source || 'autodesk_acc',
        sourceId: fileId,
        filePath: filePath,
        fileSize: fileSize || fileBuffer.length,
        format: format,
        metadata: {
          autodeskProjectId,
          originalName: fileName,
          downloadedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      model,
      message: 'File connected successfully',
    });
  } catch (error) {
    console.error('Autodesk connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect file' },
      { status: 500 }
    );
  }
}
