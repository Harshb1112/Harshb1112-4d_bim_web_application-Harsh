import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

/**
 * Cleanup duplicate models for a project
 * This endpoint helps clean up existing duplicates by keeping only the most recent model
 * per source type and removing older duplicates
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check - only admins can run cleanup
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { project_id, dryRun = true } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Get all models for the project
    const models = await prisma.model.findMany({
      where: { projectId: parseInt(project_id) },
      orderBy: { uploadedAt: 'desc' },
    });

    // Group models by source and identifier
    const modelGroups = new Map<string, typeof models>();

    for (const model of models) {
      let key = `${model.source}`;
      
      // Add unique identifier to the key based on source type
      if (model.source === 'speckle' && model.sourceId) {
        key += `_${model.sourceId}`;
      } else if ((model.source === 'autodesk_acc' || model.source === 'autodesk_drive') && model.sourceId) {
        key += `_${model.sourceId}`;
      } else if ((model.source === 'local' || model.source === 'network') && model.name) {
        key += `_${model.name}`;
      }

      if (!modelGroups.has(key)) {
        modelGroups.set(key, []);
      }
      modelGroups.get(key)!.push(model);
    }

    // Find duplicates (groups with more than one model)
    const duplicates: { key: string; kept: typeof models[0]; removed: { id: number; name: string | null; uploadedAt: Date }[] }[] = [];
    const toDelete: number[] = [];

    for (const [key, group] of modelGroups.entries()) {
      if (group.length > 1) {
        // Keep the most recent, mark others for deletion
        const [keep, ...remove] = group;
        
        duplicates.push({
          key,
          kept: keep,
          removed: remove.map(m => ({ id: m.id, name: m.name, uploadedAt: m.uploadedAt })),
        });

        toDelete.push(...remove.map(m => m.id));
      }
    }

    if (duplicates.length === 0) {
      return NextResponse.json({
        message: 'No duplicates found',
        duplicates: [],
        deletedCount: 0,
      });
    }

    let deletedCount = 0;

    // Delete duplicates if not a dry run
    if (!dryRun) {
      const result = await prisma.model.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });
      deletedCount = result.count;
    }

    return NextResponse.json({
      message: dryRun 
        ? `Found ${duplicates.length} duplicate groups (${toDelete.length} models to remove). Run with dryRun=false to delete.`
        : `Cleaned up ${deletedCount} duplicate models`,
      duplicates,
      deletedCount,
      dryRun,
    });
  } catch (error) {
    console.error('[Cleanup Duplicates API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cleanup duplicates' },
      { status: 500 }
    );
  }
}
