import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// GET - Fetch active sessions
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    
    const sessions = await prisma.loginSession.findMany({
      where: { 
        userId: decoded.userId,
        isActive: true 
      },
      orderBy: { lastActive: 'desc' }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// DELETE - Revoke a session
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Revoke specific session
      await prisma.loginSession.update({
        where: { id: parseInt(sessionId) },
        data: { isActive: false }
      })
    } else {
      // Revoke all other sessions
      await prisma.loginSession.updateMany({
        where: { 
          userId: decoded.userId,
          isActive: true 
        },
        data: { isActive: false }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke session:', error)
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
  }
}
