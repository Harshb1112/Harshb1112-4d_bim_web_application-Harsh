import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const projectId = formData.get('projectId') as string
    const fileName = formData.get('fileName') as string

    if (!videoFile || !projectId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: video, projectId, or fileName' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'videos', projectId)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save the video file
    const bytes = await videoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = path.join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    // Generate download URL
    const downloadUrl = `/uploads/videos/${projectId}/${fileName}`

    return NextResponse.json({
      message: 'Video exported successfully',
      downloadUrl,
      fileName,
      size: buffer.length,
    })
  } catch (error) {
    console.error('Video export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export video' },
      { status: 500 }
    )
  }
}
