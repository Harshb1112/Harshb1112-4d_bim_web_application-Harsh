import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileName: string }> }
) {
  try {
    const { projectId, fileName } = await params
    
    // Construct file path
    const filePath = path.join(process.cwd(), 'uploads', 'videos', projectId, fileName)

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(filePath)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/webm',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error serving video:', error)
    return NextResponse.json(
      { error: 'Failed to serve video' },
      { status: 500 }
    )
  }
}
