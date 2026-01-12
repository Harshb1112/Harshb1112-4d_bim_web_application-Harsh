import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// Server-side Speckle element sync endpoint
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

    const { modelId, serverUrl, speckleToken, streamId, commitId } = await request.json()

    if (!modelId || !serverUrl || !speckleToken || !streamId || !commitId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // TODO: Implement server-side Speckle element extraction
    // For now, elements are extracted client-side via the viewer
    return NextResponse.json({
      success: false,
      message: 'Server-side Speckle sync not yet implemented. Use client-side extraction via the viewer.'
    }, { status: 501 })

  } catch (error) {
    console.error('Element sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error during element sync' },
      { status: 500 }
    )
  }
}