import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

/**
 * Get model details - Returns metadata only, NO file creation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const modelId = parseInt(id);
    if (isNaN(modelId)) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 });
    }

    // Get model metadata ONLY - no file operations
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        uploader: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        source: model.source,
        sourceUrl: model.sourceUrl,
        sourceId: model.sourceId,
        filePath: model.filePath,
        fileSize: model.fileSize,
        format: model.format,
        version: model.version,
        metadata: model.metadata,
        uploadedAt: model.uploadedAt,
        project: model.project,
        uploadedBy: model.uploader,
      },
    });
  } catch (error) {
    console.error('[Get Model API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get model' },
      { status: 500 }
    );
  }
}
