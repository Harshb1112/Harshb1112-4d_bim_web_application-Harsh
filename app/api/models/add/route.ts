import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, name, source, sourceUrl, sourceId, format } = body

    if (!projectId || !name || !source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check access (admin/manager can add to any, others need team membership)
    if (user.role !== 'admin' && user.role !== 'manager') {
      const isMember = project.team?.members.some(m => m.userId === user.id)
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Create model record
    const model = await prisma.model.create({
      data: {
        projectId,
        name,
        source,
        sourceUrl: sourceUrl || null,
        sourceId: sourceId || null,
        format: format || null,
        uploadedBy: user.id,
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId,
        action: 'MODEL_ADDED',
        details: { 
          modelId: model.id,
          modelName: name,
          source
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      model,
      message: 'Model added successfully' 
    })
  } catch (error) {
    console.error('Add model error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add model' },
      { status: 500 }
    )
  }
}
