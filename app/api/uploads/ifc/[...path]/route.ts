import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    
    // Construct file path
    const filePath = join(process.cwd(), 'uploads', 'ifc', ...pathSegments)
    
    // Security check: ensure path is within uploads directory
    const uploadsDir = join(process.cwd(), 'uploads', 'ifc')
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Read and serve file
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on file extension
    const fileName = pathSegments[pathSegments.length - 1]
    let contentType = 'application/octet-stream'
    
    if (fileName.endsWith('.ifc')) {
      contentType = 'application/x-step' // IFC MIME type
    } else if (fileName.endsWith('.ifczip')) {
      contentType = 'application/zip'
    }
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
  } catch (error) {
    console.error('Error serving IFC file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}
