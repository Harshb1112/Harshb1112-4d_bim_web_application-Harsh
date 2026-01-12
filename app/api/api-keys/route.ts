import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import crypto from 'crypto'

// Generate a secure API key
function generateApiKey(): { key: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const prefix = randomBytes.substring(0, 8)
  const key = `4dbim_${randomBytes}`
  return { key, prefix }
}

// GET - List all API keys for user
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only Admin and Manager can have API keys
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'API access is only available for Admin and Manager roles' }, { status: 403 })
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, apiKeys })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST - Generate new API key
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

    // Only Admin and Manager can generate API keys
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'API access is only available for Admin and Manager roles' }, { status: 403 })
    }

    const body = await request.json()
    const { name, expiresInDays } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 })
    }

    const { key, prefix } = generateApiKey()
    
    // Calculate expiry date if provided
    let expiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: name.trim(),
        key,
        keyPrefix: prefix,
        expiresAt,
        permissions: {
          read: true,
          write: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Only shown once!
        keyPrefix: apiKey.keyPrefix,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      }
    })
  } catch (error) {
    console.error('Error generating API key:', error)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
  }
}
