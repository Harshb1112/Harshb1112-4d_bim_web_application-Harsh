import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// GET - Fetch language settings
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId || decoded.id || decoded.sub
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token structure' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        language: true,
        timezone: true,
        dateFormat: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch language settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Update language settings
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      console.error('❌ No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
      console.log('🔑 Decoded token:', decoded)
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId || decoded.id || decoded.sub
    if (!userId) {
      console.error('❌ No userId in token:', decoded)
      return NextResponse.json({ error: 'Invalid token structure' }, { status: 401 })
    }

    const body = await req.json()
    console.log('📝 Updating language settings for user:', userId, body)

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        language: body.language || 'en',
        timezone: body.timezone || 'UTC',
        dateFormat: body.dateFormat || 'MM/DD/YYYY',
      },
      select: {
        language: true,
        timezone: true,
        dateFormat: true,
      }
    })

    console.log('✅ Language settings updated:', updatedUser)

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('❌ Failed to update language settings:', error)
    return NextResponse.json({ 
      error: 'Failed to update settings',
      details: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
