import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Get captures with optional date filtering
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { projectId } = await params
    const projectIdInt = parseInt(projectId)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const captureType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const whereClause: any = { projectId: projectIdInt }

    if (startDate && endDate) {
      whereClause.capturedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (captureType) {
      whereClause.captureType = captureType
    }

    const captures = await prisma.siteCapture.findMany({
      where: whereClause,
      orderBy: { capturedAt: 'desc' },
      take: limit,
      include: {
        camera: {
          select: { name: true, cameraType: true, location: true }
        }
      }
    })

    // Get unique dates for timeline
    const allCaptures = await prisma.siteCapture.findMany({
      where: { projectId: projectIdInt },
      select: { capturedAt: true },
      orderBy: { capturedAt: 'asc' }
    })

    const uniqueDates = [...new Set(
      allCaptures.map(c => c.capturedAt.toISOString().split('T')[0])
    )]

    return NextResponse.json({
      captures: captures.map(cap => ({
        ...cap,
        capturedAt: cap.capturedAt.toISOString(),
        createdAt: cap.createdAt.toISOString()
      })),
      availableDates: uniqueDates,
      total: allCaptures.length
    })
  } catch (error) {
    console.error('Get captures error:', error)
    return NextResponse.json({ error: 'Failed to fetch captures' }, { status: 500 })
  }
}

// POST - Upload a new capture
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || !['admin', 'manager', 'team_leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { projectId } = await params
    const projectIdInt = parseInt(projectId)
    const body = await request.json()

    const capture = await prisma.siteCapture.create({
      data: {
        projectId: projectIdInt,
        cameraId: body.cameraId,
        captureType: body.captureType,
        url: body.url,
        thumbnailUrl: body.thumbnailUrl,
        fileSize: body.fileSize,
        duration: body.duration,
        resolution: body.resolution,
        capturedAt: new Date(body.capturedAt),
        weather: body.weather,
        temperature: body.temperature,
        notes: body.notes,
        metadata: body.metadata,
        isProcessed: body.isProcessed ?? false
      }
    })

    return NextResponse.json({ capture }, { status: 201 })
  } catch (error) {
    console.error('Create capture error:', error)
    return NextResponse.json({ error: 'Failed to create capture' }, { status: 500 })
  }
}
