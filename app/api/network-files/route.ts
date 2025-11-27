import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const networkPath = searchParams.get("path") || "\\\\BIMBOSSSERVER\\autodesk development\\IFC"
    
    // Check if path exists
    if (!fs.existsSync(networkPath)) {
      return NextResponse.json(
        { error: "Network path not accessible" },
        { status: 404 }
      )
    }

    // Read directory
    const files = fs.readdirSync(networkPath)
    
    // Filter IFC files and get details
    const ifcFiles = files
      .filter(file => file.toLowerCase().endsWith('.ifc'))
      .map(file => {
        const file_path = path.join(networkPath, file)
        const stats = fs.statSync(file_path)
        
        return {
          name: file,
          path: file_path,
          size: stats.size,
          modified: stats.mtime.toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      files: ifcFiles,
      path: networkPath
    })

  } catch (error: any) {
    console.error("Error reading network files:", error)
    return NextResponse.json(
      { error: error.message || "Failed to read network files" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourcePath, project_id } = body

    if (!sourcePath || !project_id) {
      return NextResponse.json(
        { error: "Source path and project ID are required" },
        { status: 400 }
      )
    }

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json(
        { error: "Source file not found" },
        { status: 404 }
      )
    }

    // Create destination directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ifc')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Generate unique file_name
    const file_name = path.basename(sourcePath)
    const timestamp = Date.now()
    const destFileName = `${timestamp}_${file_name}`
    const destPath = path.join(uploadDir, destFileName)

    // Copy file from network location
    fs.copyFileSync(sourcePath, destPath)

    const stats = fs.statSync(destPath)

    return NextResponse.json({
      success: true,
      file: {
        name: file_name,
        path: `/uploads/ifc/${destFileName}`,
        size: stats.size
      }
    })

  } catch (error: any) {
    console.error("Error copying network file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to copy file" },
      { status: 500 }
    )
  }
}
