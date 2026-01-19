import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// PATCH - Update integration
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
    const integrationId = parseInt(id)

    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    const body = await request.json()
    const { isActive, config, name } = body

    // Verify ownership
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update integration
    const updated = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(config && { config }),
        ...(name && { name }),
        ...(isActive && { lastSyncAt: new Date() })
      }
    })

    return NextResponse.json({
      success: true,
      integration: {
        id: updated.id,
        type: updated.type,
        name: updated.name,
        isActive: updated.isActive,
        lastSyncAt: updated.lastSyncAt,
        createdAt: updated.createdAt
      }
    })
  } catch (error) {
    console.error('Error updating integration:', error)
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 })
  }
}

// DELETE - Delete integration
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
    const integrationId = parseInt(id)

    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    // Verify ownership
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete integration
    await prisma.integration.delete({
      where: { id: integrationId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 })
  }
}

// GET - Get integration details
export async function GET(
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
    const integrationId = parseInt(id)

    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        isActive: integration.isActive,
        lastSyncAt: integration.lastSyncAt,
        createdAt: integration.createdAt,
        config: integration.config
      }
    })
  } catch (error) {
    console.error('Error fetching integration:', error)
    return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 })
  }
}
