import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { fetchAndExtractElements } from '@/lib/speckle-element-extractor'

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

    const elements = await fetchAndExtractElements(serverUrl, speckleToken, streamId, commitId)

    const upsertPromises = elements.map(el =>
      prisma.element.upsert({
        where: { guid: el.guid },
        update: {
          modelId,
          category: el.category,
          family: el.family,
          typeName: el.typeName,
          level: el.level,
          parameters: el.parameters
        },
        create: {
          modelId,
          guid: el.guid,
          category: el.category,
          family: el.family,
          typeName: el.typeName,
          level: el.level,
          parameters: el.parameters
        }
      })
    )

    await prisma.$transaction(upsertPromises)

    return NextResponse.json({
      success: true,
      message: `Synced ${elements.length} elements successfully.`
    })

  } catch (error) {
    console.error('Element sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error during element sync' },
      { status: 500 }
    )
  }
}