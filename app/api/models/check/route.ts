import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { findExistingModel } from '@/lib/model-deduplication';

/**
 * Check if a model already exists for a project
 * This endpoint helps prevent duplicate uploads by checking before file transfer
 */
export async function POST(request: NextRequest) {
  try {
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
    const { project_id, source, source_id, source_url, file_name } = body;

    if (!project_id || !source) {
      return NextResponse.json(
        { error: 'project_id and source are required' },
        { status: 400 }
      );
    }

    const existingModel = await findExistingModel({
      projectId: parseInt(project_id),
      source,
      sourceId: source_id,
      sourceUrl: source_url,
      fileName: file_name,
    });

    if (existingModel) {
      return NextResponse.json({
        exists: true,
        model: existingModel,
        message: 'A model with these identifiers already exists for this project',
      });
    }

    return NextResponse.json({
      exists: false,
      message: 'No existing model found, safe to upload',
    });
  } catch (error) {
    console.error('[Check Model API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check model' },
      { status: 500 }
    );
  }
}
