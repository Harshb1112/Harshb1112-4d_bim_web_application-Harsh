import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const resourceId = parseInt(id)

    await prisma.resource.delete({
      where: { id: resourceId }
    })

    return NextResponse.json({ message: 'Resource deleted successfully' })
  } catch (error) {
    console.error('Delete resource error:', error)
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const resourceId = parseInt(id)
    const body = await request.json()

    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        name: body.name,
        type: body.type,
        unit: body.unit || null,
        hourlyRate: body.hourlyRate ? parseFloat(body.hourlyRate) : null,
        dailyRate: body.dailyRate ? parseFloat(body.dailyRate) : null,
        capacity: body.capacity ? parseInt(body.capacity) : null,
        description: body.description || null
      }
    })

    return NextResponse.json({ resource, message: 'Resource updated successfully' })
  } catch (error) {
    console.error('Update resource error:', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
}
