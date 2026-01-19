import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// POST - Test webhook integration
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
    const { integrationId, webhookUrl, payload } = body

    if (!integrationId || !webhookUrl) {
      return NextResponse.json({ 
        error: 'Integration ID and webhook URL are required' 
      }, { status: 400 })
    }

    // Verify integration ownership
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Send test webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BIMBOSS-Integration/1.0'
      },
      body: JSON.stringify(payload || {
        event: 'test',
        timestamp: new Date().toISOString(),
        source: 'BIMBOSS',
        data: {
          message: 'Test webhook from BIMBOSS'
        }
      })
    })

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status ${webhookResponse.status}`)
    }

    // Update last sync time
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook sent successfully',
      status: webhookResponse.status
    })
  } catch (error: any) {
    console.error('Error sending webhook:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to send webhook' 
    }, { status: 500 })
  }
}
