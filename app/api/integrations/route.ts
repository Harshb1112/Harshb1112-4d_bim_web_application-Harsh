import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// GET - List all integrations for user
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const integrations = await prisma.integration.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, integrations })
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
  }
}

// POST - Create new integration
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
    const { type, name, config } = body

    if (!type || !name || !config) {
      return NextResponse.json({ error: 'Type, name, and config are required' }, { status: 400 })
    }

    // Validate integration type
    const validTypes = ['slack', 'teams', 'jira', 'webhook', 'sap_ps', 'sap', 'erp']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 })
    }

    const integration = await prisma.integration.create({
      data: {
        userId: user.id,
        type,
        name,
        config
      }
    })

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        isActive: integration.isActive,
        createdAt: integration.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating integration:', error)
    return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 })
  }
}
