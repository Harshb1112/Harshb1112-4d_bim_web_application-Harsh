import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST - Subscribe to push notifications
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    const body = await req.json()
    const { endpoint, keys } = body

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    })

    if (existing) {
      // Update to active if it was inactive
      await prisma.pushSubscription.update({
        where: { endpoint },
        data: { isActive: true }
      })
      return NextResponse.json({ success: true, message: 'Subscription updated' })
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId: decoded.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers.get('user-agent') || 'Unknown'
      }
    })

    console.log('✅ Push subscription created for user:', decoded.userId)

    return NextResponse.json({ success: true, message: 'Subscribed to push notifications' })
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    await prisma.pushSubscription.update({
      where: { endpoint },
      data: { isActive: false }
    })

    console.log('✅ Push subscription removed for user:', decoded.userId)

    return NextResponse.json({ success: true, message: 'Unsubscribed from push notifications' })
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
