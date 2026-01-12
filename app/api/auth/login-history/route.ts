import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Fetch login sessions for the user (last 10)
    const loginSessions = await prisma.loginSession.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        browser: true,
        ipAddress: true,
        location: true,
        isActive: true,
        lastActive: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      sessions: loginSessions
    })

  } catch (error) {
    console.error('Error fetching login history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch login history' },
      { status: 500 }
    )
  }
}
