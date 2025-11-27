import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { file_path } = await request.json()
    
    if (!file_path) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 })
    }

    // Read the IFC file
    const fullPath = path.join(process.cwd(), 'public', file_path)
    const fileBuffer = await readFile(fullPath)
    
    // For now, just return basic info
    // In production, you'd parse IFC here or use a service
    return NextResponse.json({
      success: true,
      file_size: fileBuffer.length,
      file_name: path.basename(file_path),
      message: 'IFC file found - use Autodesk Forge for proper viewing'
    })
  } catch (error: any) {
    console.error('Error parsing IFC:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
