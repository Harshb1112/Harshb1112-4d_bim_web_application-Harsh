import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Get all cameras for a project
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

    const cameras = await prisma.siteCamera.findMany({
      where: { projectId: projectIdInt },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      cameras: cameras.map(cam => ({
        ...cam,
        lastPingAt: cam.lastPingAt?.toISOString(),
        createdAt: cam.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Get cameras error:', error)
    return NextResponse.json({ error: 'Failed to fetch cameras' }, { status: 500 })
  }
}

// POST - Add a new camera
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

    const camera = await prisma.siteCamera.create({
      data: {
        projectId: projectIdInt,
        name: body.name,
        cameraType: body.cameraType || '360',
        brand: body.brand,
        model: body.model,
        streamUrl: body.streamUrl,
        snapshotUrl: body.snapshotUrl,
        apiKey: body.apiKey,
        apiSecret: body.apiSecret,
        location: body.location,
        latitude: body.latitude,
        longitude: body.longitude,
        altitude: body.altitude,
        isActive: body.isActive ?? true,
        isLive: body.isLive ?? false,
        settings: body.settings
      }
    })

    return NextResponse.json({ camera }, { status: 201 })
  } catch (error) {
    console.error('Create camera error:', error)
    return NextResponse.json({ error: 'Failed to create camera' }, { status: 500 })
  }
}
