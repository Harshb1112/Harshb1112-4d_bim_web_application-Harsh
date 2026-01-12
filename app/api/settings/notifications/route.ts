import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// GET - Fetch notification settings
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded: any = jwt.verify(token, JWT_SECRET)
    const userId = decoded.userId || decoded.id || decoded.sub
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        emailNotifications: true,
        taskNotifications: true,
        projectNotifications: true,
        weeklyDigest: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch notification settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Update notification settings
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded: any = jwt.verify(token, JWT_SECRET)
    const userId = decoded.userId || decoded.id || decoded.sub
    const body = await req.json()

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        emailNotifications: body.emailNotifications,
        taskNotifications: body.taskNotifications,
        projectNotifications: body.projectNotifications,
        weeklyDigest: body.weeklyDigest,
      },
      select: {
        emailNotifications: true,
        taskNotifications: true,
        projectNotifications: true,
        weeklyDigest: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update notification settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
