import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { findOrCreateModel } from '@/lib/model-deduplication';

export async function POST(request: NextRequest) {
  try {
    console.log('[Register API] Starting model registration...')
    
    // Auth check
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const body = await request.json();
    const { project_id, file_path, file_name, file_size } = body;

    console.log('[Register API] Data:', { project_id, file_path, file_name, file_size })

    if (!project_id || !file_path || !file_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify file exists
    const fullPath = join(process.cwd(), 'public', file_path);
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get actual file size if not provided
    let actualSize = file_size;
    if (!actualSize) {
      const stats = statSync(fullPath);
      actualSize = stats.size;
    }

    // Find or create model record (prevents duplicates)
    const { model, created } = await findOrCreateModel({
      projectId: parseInt(project_id),
      name: file_name,
      source: 'network',
      filePath: fullPath,
      fileSize: Math.floor(actualSize),
      format: 'ifc',
      sourceUrl: file_path,
      uploadedBy: user.id,
    });

    console.log(`[Register API] Model ${created ? 'registered' : 'updated'} successfully:`, model.id)
    
    return NextResponse.json({ 
      success: true, 
      model,
      message: 'Model registered successfully' 
    });
  } catch (error) {
    console.error('[Register API] Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register model' },
      { status: 500 }
    );
  }
}
