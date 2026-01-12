import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// DELETE - Remove integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const integrationId = parseInt(params.id)

    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    // Check if integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, userId: user.id }
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Delete the integration
    await prisma.integration.delete({
      where: { id: integrationId }
    })

    return NextResponse.json({ success: true, message: 'Integration removed successfully' })
  } catch (error) {
    console.error('Error removing integration:', error)
    return NextResponse.json({ error: 'Failed to remove integration' }, { status: 500 })
  }
}

// PATCH - Toggle integration active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const integrationId = parseInt(params.id)

    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    const body = await request.json()
    const { isActive } = body

    // Check if integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, userId: user.id }
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Update the integration
    const updated = await prisma.integration.update({
      where: { id: integrationId },
      data: { isActive }
    })

    return NextResponse.json({ success: true, integration: updated })
  } catch (error) {
    console.error('Error updating integration:', error)
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 })
  }
}
