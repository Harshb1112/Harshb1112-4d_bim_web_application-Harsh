import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// For IFC files, we can't parse server-side due to WASM issues
// Instead, return model info and let client parse it
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Await params (Next.js 15+ requirement)
    const { id } = await params
    const modelId = parseInt(id)
    if (isNaN(modelId)) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 })
    }

    console.log('[Elements API] Fetching model:', modelId)

    // Fetch model with project access check
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        project: {
          include: {
            projectUsers: true,
            createdBy: true
          }
        }
      }
    })

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // Check if user has access to this project
    const isCreator = model.project.createdBy?.id === decoded.id
    const isProjectMember = model.project.projectUsers.some(pu => pu.userId === decoded.id)
    const isAdmin = decoded.role === 'admin'
    
    if (!isCreator && !isProjectMember && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // For IFC files, return instruction to parse client-side
    const isIFC = model.filePath?.toLowerCase().endsWith('.ifc')
    
    if (isIFC) {
      return NextResponse.json({ 
        message: 'IFC file - parse client-side',
        modelId: modelId,
        modelName: model.name,
        fileUrl: `/api/models/${modelId}/file`,
        parseClientSide: true,
        elements: [] // Client will populate this
      })
    }

    // For other model types, return empty for now
    return NextResponse.json({
      elements: [],
      count: 0,
      modelId: modelId,
      modelName: model.name,
      message: 'Element extraction not supported for this model type'
    })

  } catch (error: any) {
    console.error('[Elements API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get model info', 
        details: error.message,
        elements: []
      },
      { status: 500 }
    )
  }
}
