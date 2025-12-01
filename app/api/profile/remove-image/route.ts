import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current profile image using raw SQL
    const result = await prisma.$queryRaw<{profile_image: string | null}[]>`
      SELECT profile_image FROM users WHERE id = ${user.id}
    `
    const currentImage = result[0]?.profile_image

    // Delete old image file if exists
    if (currentImage) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', currentImage)
        await unlink(oldFilePath)
      } catch (e) {
        // File might not exist, ignore error
      }
    }

    // Update user to remove profile image using raw SQL
    await prisma.$executeRaw`UPDATE users SET profile_image = NULL WHERE id = ${user.id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove image error:', error)
    return NextResponse.json({ error: 'Failed to remove image' }, { status: 500 })
  }
}
