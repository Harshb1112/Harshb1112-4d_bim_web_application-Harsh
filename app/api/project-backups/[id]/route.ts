import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

// Helper function to retry database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      const isConnectionError = lastError.message?.includes('database server') || 
                                lastError.message?.includes('connection') ||
                                lastError.message?.includes('P1001')
      if (!isConnectionError || i === maxRetries - 1) {
        throw error
      }
      console.log(`[DB Retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

// DELETE a backup
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await context.params
    const backupId = parseInt(id)

    if (isNaN(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400 })
    }

    // Get backup details
    const backup = await withRetry(() => prisma.projectBackup.findUnique({
      where: { id: backupId },
      include: {
        project: true
      }
    }))

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    // Check if user has access to this project
    const hasAccess = user.role === 'admin' || 
                     user.role === 'manager' || 
                     backup.project.createdById === user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete backup file if it exists
    if (backup.filePath) {
      try {
        const fullPath = path.join(process.cwd(), backup.filePath)
        await fs.unlink(fullPath)
        console.log(`[Backup Delete] File deleted: ${fullPath}`)
      } catch (fileError) {
        console.error('[Backup Delete] Failed to delete file:', fileError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete backup from database
    await withRetry(() => prisma.projectBackup.delete({
      where: { id: backupId }
    }))

    // Log activity
    await withRetry(() => prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: backup.projectId,
        action: 'BACKUP_DELETED',
        details: {
          backupId,
          backupName: backup.name
        }
      }
    }))

    return NextResponse.json({ 
      success: true,
      message: 'Backup deleted successfully' 
    })
  } catch (error) {
    console.error('[Backup Delete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    )
  }
}

// GET a single backup
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await context.params
    const backupId = parseInt(id)

    if (isNaN(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400 })
    }

    const backup = await withRetry(() => prisma.projectBackup.findUnique({
      where: { id: backupId },
      include: {
        project: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    }))

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    // Check if user has access to this project
    const hasAccess = user.role === 'admin' || 
                     user.role === 'manager' || 
                     backup.project.createdById === user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ backup })
  } catch (error) {
    console.error('[Backup Get] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backup' },
      { status: 500 }
    )
  }
}

// POST to restore a backup
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await context.params
    const backupId = parseInt(id)

    if (isNaN(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400 })
    }

    // Get backup details
    const backup = await withRetry(() => prisma.projectBackup.findUnique({
      where: { id: backupId },
      include: {
        project: true
      }
    }))

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    // Check if user has access to this project
    const hasAccess = user.role === 'admin' || 
                     user.role === 'manager' || 
                     backup.project.createdById === user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Read backup file
    if (!backup.filePath) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
    }

    const fullPath = path.join(process.cwd(), backup.filePath)
    const backupData = JSON.parse(await fs.readFile(fullPath, 'utf-8'))

    // Restore logic would go here
    // For now, just return success
    console.log('[Backup Restore] Restoring backup:', backupId)

    // Log activity
    await withRetry(() => prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: backup.projectId,
        action: 'BACKUP_RESTORED',
        details: {
          backupId,
          backupName: backup.name
        }
      }
    }))

    return NextResponse.json({ 
      success: true,
      message: 'Backup restore initiated',
      data: backupData
    })
  } catch (error) {
    console.error('[Backup Restore] Error:', error)
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    )
  }
}
