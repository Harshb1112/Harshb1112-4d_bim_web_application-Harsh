/**
 * Model Deduplication Helper
 * 
 * This module provides utilities to prevent duplicate model creation
 * across different BIM integration sources (Speckle, Autodesk, IFC, Network)
 */

import { prisma } from '@/lib/db';

export interface ModelIdentifier {
  projectId: number;
  source: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  filePath?: string | null;
  fileName?: string | null;
}

export interface ModelData {
  projectId: number;
  name: string;
  source: string;
  sourceUrl?: string | null;
  sourceId?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  format?: string | null;
  metadata?: any;
  uploadedBy?: number | null;
  version?: number;
}

/**
 * Find an existing model based on project and source identifiers
 * This prevents duplicate models from being created
 */
export async function findExistingModel(identifier: ModelIdentifier) {
  const { projectId, source, sourceId, sourceUrl, filePath, fileName } = identifier;

  // Build the where clause based on available identifiers
  const whereConditions: any = {
    projectId,
    source,
  };

  // For Speckle: match by sourceId (streamId) or sourceUrl
  if (source === 'speckle') {
    if (sourceId) {
      whereConditions.sourceId = sourceId;
    } else if (sourceUrl) {
      whereConditions.sourceUrl = sourceUrl;
    }
  }
  
  // For Autodesk sources: match by sourceId (fileId/URN)
  else if (source === 'autodesk_acc' || source === 'autodesk_drive' || source === 'acc' || source === 'drive') {
    if (sourceId) {
      whereConditions.sourceId = sourceId;
    }
  }
  
  // For local/network IFC files: match by file name to avoid re-uploading the same file
  else if (source === 'local' || source === 'network') {
    if (fileName) {
      whereConditions.name = fileName;
    } else if (filePath) {
      // Extract filename from path if not provided
      const extractedName = filePath.split(/[/\\]/).pop();
      if (extractedName) {
        whereConditions.name = extractedName;
      }
    }
  }

  // If we don't have enough identifiers, return null (can't deduplicate)
  if (Object.keys(whereConditions).length <= 2) {
    return null;
  }

  try {
    const existingModel = await prisma.model.findFirst({
      where: whereConditions,
      orderBy: { uploadedAt: 'desc' }, // Get the most recent if multiple exist
    });

    return existingModel;
  } catch (error) {
    console.error('[Model Deduplication] Error finding existing model:', error);
    return null;
  }
}

/**
 * Find or create a model - prevents duplicates while ensuring a model exists
 * Returns { model, created: boolean }
 */
export async function findOrCreateModel(data: ModelData) {
  // First, try to find an existing model
  const identifier: ModelIdentifier = {
    projectId: data.projectId,
    source: data.source,
    sourceId: data.sourceId,
    sourceUrl: data.sourceUrl,
    filePath: data.filePath,
    fileName: data.name,
  };

  const existingModel = await findExistingModel(identifier);

  if (existingModel) {
    console.log('[Model Deduplication] Found existing model:', existingModel.id);
    
    // Update the existing model with new data if needed
    const updatedModel = await prisma.model.update({
      where: { id: existingModel.id },
      data: {
        // Update metadata and version
        version: (existingModel.version || 1) + 1,
        metadata: data.metadata || existingModel.metadata,
        // Update file info if provided
        ...(data.fileSize && { fileSize: data.fileSize }),
        ...(data.filePath && { filePath: data.filePath }),
        ...(data.sourceUrl && { sourceUrl: data.sourceUrl }),
      },
    });

    return { model: updatedModel, created: false };
  }

  // No existing model found, create a new one
  console.log('[Model Deduplication] Creating new model for project:', data.projectId);
  
  const newModel = await prisma.model.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      source: data.source,
      sourceUrl: data.sourceUrl || null,
      sourceId: data.sourceId || null,
      filePath: data.filePath || null,
      fileSize: data.fileSize || null,
      format: data.format || null,
      metadata: data.metadata || null,
      uploadedBy: data.uploadedBy || null,
      version: data.version || 1,
    },
  });

  return { model: newModel, created: true };
}

/**
 * Update an existing model's file or source information
 * Used when syncing or re-uploading
 */
export async function updateModelSource(
  modelId: number,
  updates: Partial<ModelData>
) {
  try {
    const updatedModel = await prisma.model.update({
      where: { id: modelId },
      data: {
        ...(updates.sourceUrl && { sourceUrl: updates.sourceUrl }),
        ...(updates.sourceId && { sourceId: updates.sourceId }),
        ...(updates.filePath && { filePath: updates.filePath }),
        ...(updates.fileSize && { fileSize: updates.fileSize }),
        ...(updates.metadata && { metadata: updates.metadata }),
        version: { increment: 1 },
      },
    });

    return updatedModel;
  } catch (error) {
    console.error('[Model Deduplication] Error updating model:', error);
    throw error;
  }
}
