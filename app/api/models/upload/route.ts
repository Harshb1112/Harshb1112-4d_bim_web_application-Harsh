import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import prisma from '@/lib/db';

// Route segment config for large file uploads
export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = parseInt(formData.get('projectId') as string);
    const modelName = formData.get('name') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId || isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Validate file type - Only IFC files
    const fileName = file.name.toLowerCase();
    const isIFC = fileName.endsWith('.ifc') || fileName.endsWith('.ifczip');
    
    if (!isIFC) {
      return NextResponse.json({ error: 'Only IFC files are supported' }, { status: 400 });
    }

    // Validate file size (10GB max)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large (max 10GB for IFC files)' 
      }, { status: 400 });
    }

    // Log file size
    const sizeMB = file.size / 1024 / 1024;
    const sizeGB = sizeMB / 1024;
    console.log(`[Upload] IFC file: ${sizeGB > 1 ? sizeGB.toFixed(2) + 'GB' : sizeMB.toFixed(0) + 'MB'}`);
    
    // Mark large files for server-side processing
    const needsServerProcessing = file.size > 500 * 1024 * 1024; // > 500MB
    if (needsServerProcessing) {
      console.log('[Upload] Large file - will require server-side processing for viewing');
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'ifc');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');
    const filePath = join(uploadsDir, `${timestamp}_${safeFileName}`);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create model record in database
    const model = await prisma.model.create({
      data: {
        projectId,
        name: modelName || file.name,
        source: 'local_ifc',
        filePath: filePath,
        fileSize: file.size,
        format: 'ifc',
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          fileType: 'ifc',
          needsServerProcessing: needsServerProcessing,
          sizeMB: sizeMB,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      model,
      message: 'File uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
