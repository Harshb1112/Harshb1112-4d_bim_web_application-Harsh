import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST - Verify 2FA code
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    const body = await req.json()
    const { code } = body

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { twoFactorSecret: true }
    })

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'No 2FA setup found' }, { status: 400 })
    }

    // Parse stored data: secret:code:expiry
    const [secret, storedCode, expiryStr] = user.twoFactorSecret.split(':')
    const expiry = parseInt(expiryStr)

    // Check if code expired
    if (Date.now() > expiry) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
    }

    // Verify code
    if (code !== storedCode) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret // Keep only the secret, remove code and expiry
      }
    })

    return NextResponse.json({ 
      success: true,
      message: '2FA enabled successfully'
    })
  } catch (error) {
    console.error('Failed to verify 2FA:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}
