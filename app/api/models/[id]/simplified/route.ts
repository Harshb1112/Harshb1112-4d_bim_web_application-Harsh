import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

/**
 * Get simplified model info for large IFC files
 * Returns basic metadata without loading full geometry
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

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        fileSize: true,
        source: true,
        metadata: true,
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Return simplified info
    return NextResponse.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        fileSize: model.fileSize,
        sizeMB: model.fileSize ? (model.fileSize / 1024 / 1024).toFixed(2) : 0,
        sizeGB: model.fileSize ? (model.fileSize / 1024 / 1024 / 1024).toFixed(2) : 0,
        isLarge: model.fileSize && model.fileSize > 500 * 1024 * 1024,
        canViewInBrowser: model.fileSize && model.fileSize <= 500 * 1024 * 1024,
        metadata: model.metadata,
      },
    });
  } catch (error) {
    console.error('[Simplified Model API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get model info' },
      { status: 500 }
    );
  }
}
