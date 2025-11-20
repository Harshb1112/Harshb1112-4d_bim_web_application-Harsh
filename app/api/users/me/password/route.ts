import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest, hashPassword, verifyPassword } from '@/lib/auth'

// PUT update current user's password
export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, dbUser.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 401 })
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    })

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Update password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}