import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

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
    const { notificationIds } = body

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
    }

    // Mark notifications as shown
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id
      },
      data: {
        isShown: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as shown'
    })

  } catch (error) {
    console.error('Error marking notifications as shown:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications' },
      { status: 500 }
    )
  }
}
