import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { verifyToken } from '@/lib/auth'

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
    // Allow access if: user is project creator OR user is in projectUsers OR user is admin
    const isCreator = model.project.createdBy?.id === decoded.id
    const isProjectMember = model.project.projectUsers.some(pu => pu.userId === decoded.id)
    const isAdmin = decoded.role === 'admin'
    
    if (!isCreator && !isProjectMember && !isAdmin) {
      console.log('[File Route] Access denied for user:', decoded.id, 'to model:', modelId)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if model has a file path
    if (!model.filePath) {
      return NextResponse.json({ error: 'Model file not found' }, { status: 404 })
    }

    // Read the file from the uploads directory
    // Check if filePath is already absolute or relative
    const filePath = model.filePath.startsWith('C:') || model.filePath.startsWith('/') 
      ? model.filePath 
      : join(process.cwd(), model.filePath)
    
    console.log('[File Route] Reading file from:', filePath)
    const fileBuffer = await readFile(filePath)

    // Determine content type based on file extension
    const extension = model.filePath.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    if (extension === 'ifc') {
      contentType = 'application/x-step'
    } else if (extension === 'rvt') {
      contentType = 'application/octet-stream'
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${model.name || 'model'}.${extension}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      }
    })

  } catch (error: any) {
    console.error('Error serving model file:', error)
    return NextResponse.json(
      { error: 'Failed to serve model file', details: error.message },
      { status: 500 }
    )
  }
}
