import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import webpush from 'web-push'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:harsh.bagadiya@krishnaos.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

// POST - Send push notification to user
export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, url } = await request.json()

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true
      }
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'No active subscriptions found' }, { status: 404 })
    }

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            JSON.stringify({
              title,
              body,
              url,
              timestamp: Date.now()
            })
          )
          return { success: true, subscriptionId: sub.id }
        } catch (error: any) {
          // If subscription is invalid, mark as inactive
          if (error.statusCode === 410) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { isActive: false }
            })
          }
          return { success: false, subscriptionId: sub.id, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: results.length
    })

  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}