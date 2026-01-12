import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { send2FACodeEmail } from '@/lib/email-service'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST - Enable 2FA and send verification code
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    
    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()
    const secret = crypto.randomBytes(32).toString('hex')

    // Store secret temporarily (expires in 10 minutes)
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        twoFactorSecret: `${secret}:${code}:${Date.now() + 10 * 60 * 1000}` // secret:code:expiry
      }
    })

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { email: true, fullName: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Send 2FA code via email
    await send2FACodeEmail(user.email, user.fullName, code)

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent to your email'
    })
  } catch (error) {
    console.error('Failed to enable 2FA:', error)
    return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
  }
}
