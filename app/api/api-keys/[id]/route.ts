import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// DELETE - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const keyId = parseInt(params.id)

    if (isNaN(keyId)) {
      return NextResponse.json({ error: 'Invalid API key ID' }, { status: 400 })
    }

    // Check if key belongs to user
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: user.id }
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Delete the key
    await prisma.apiKey.delete({
      where: { id: keyId }
    })

    return NextResponse.json({ success: true, message: 'API key revoked successfully' })
  } catch (error) {
    console.error('Error revoking API key:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
