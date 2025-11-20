import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// GET current user's profile
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullName, email } = await request.json()

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 })
    }

    // Check if new email already exists for another user
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
      return NextResponse.json({ error: 'Email already in use by another account' }, { status: 409 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName,
        email,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update user profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}