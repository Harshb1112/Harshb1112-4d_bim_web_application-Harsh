import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = parseInt(formData.get('projectId') as string)

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify user has access to project
    const projectAccess = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: user.id
      }
    })

    if (!projectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'models')
    try {
      await mkdir(uploadDir, { recursive: true })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filepath = join(uploadDir, filename)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Determine format from file extension
    const format = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'

    // Create model record in database
    const model = await prisma.model.create({
      data: {
        projectId,
        name: file.name,
        filePath: `/uploads/models/${filename}`,
        format,
        uploadedBy: user.id
      },
      include: {
        _count: {
          select: {
            elements: true
          }
        }
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId,
        action: 'MODEL_UPLOADED',
        details: { 
          modelName: file.name,
          format,
          size: file.size
        }
      }
    })

    return NextResponse.json({ model })
  } catch (error) {
    console.error('Model upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}