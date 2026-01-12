import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST - Disable 2FA
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }

    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })

    return NextResponse.json({ 
      success: true,
      message: '2FA disabled successfully'
    })
  } catch (error) {
    console.error('Failed to disable 2FA:', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}
