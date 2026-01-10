// API to extract elements directly from uploaded IFC file (without database)
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const modelId = parseInt(id)

    // Get model info
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        source: true,
        filePath: true,
        format: true,
        projectId: true
      }
    })

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // Only works for local IFC files
    if (model.source !== 'local_ifc' || !model.filePath) {
      return NextResponse.json({ 
        error: 'Only local IFC files can be extracted directly',
        elements: []
      }, { status: 400 })
    }

    // Check if file exists
    if (!existsSync(model.filePath)) {
      return NextResponse.json({ 
        error: 'IFC file not found on disk',
        elements: []
      }, { status: 404 })
    }

    console.log(`📄 Extracting elements from IFC file: ${model.name}`)

    // Read IFC file
    const ifcContent = readFileSync(model.filePath, 'utf-8')
    
    // Parse IFC content to extract elements
    const elements = parseIFCContent(ifcContent, model.name)

    console.log(`✅ Extracted ${elements.length} elements from ${model.name}`)

    return NextResponse.json({
      success: true,
      elements: elements,
      count: elements.length,
      modelName: model.name,
      source: 'direct_file_read'
    })

  } catch (error) {
    console.error('Error extracting elements:', error)
    return NextResponse.json(
      { error: 'Failed to extract elements', elements: [] },
      { status: 500 }
    )
  }
}

// Simple IFC parser to extract basic element information
function parseIFCContent(ifcContent: string, modelName: string): any[] {
  const elements: any[] = []
  const lines = ifcContent.split('\n')

  // IFC element types to extract
  const elementTypes = [
    'IFCWALL', 'IFCDOOR', 'IFCWINDOW', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN',
    'IFCROOF', 'IFCSTAIR', 'IFCRAILING', 'IFCFURNISHINGELEMENT',
    'IFCPLATE', 'IFCMEMBER', 'IFCCURTAINWALL', 'IFCBUILDINGELEMENTPROXY',
    'IFCSPACE', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY'
  ]

  let elementId = 1

  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('/*') || trimmedLine.startsWith('//')) {
      continue
    }

    // Check if line contains an IFC element
    for (const elementType of elementTypes) {
      if (trimmedLine.includes(elementType)) {
        // Extract GUID if present
        const guidMatch = trimmedLine.match(/'([0-9A-Za-z_$]{22})'/)
        const guid = guidMatch ? guidMatch[1] : `generated-${elementId}`

        // Extract element name if present
        const nameMatch = trimmedLine.match(/'([^']*)'/)
        const name = nameMatch ? nameMatch[1] : `${elementType} ${elementId}`

        // Determine category from type
        const category = elementType.replace('IFC', '').toLowerCase()
        const categoryCapitalized = category.charAt(0).toUpperCase() + category.slice(1)

        // Extract properties (simplified)
        const properties: any = {
          ifcType: elementType,
          modelSource: 'local_ifc',
          extractedFrom: modelName
        }

        // Try to extract dimensions if present
        const dimensionMatch = trimmedLine.match(/(\d+\.?\d*)/g)
        if (dimensionMatch && dimensionMatch.length > 0) {
          properties.dimensions = dimensionMatch.slice(0, 3).join(' x ')
        }

        elements.push({
          id: `ifc-${elementId}`,
          guid: guid,
          type: categoryCapitalized,
          name: name || `${categoryCapitalized} ${elementId}`,
          category: categoryCapitalized,
          family: elementType,
          typeName: name,
          properties: properties,
          modelName: modelName,
          modelSource: 'local_ifc'
        })

        elementId++
        break // Only match one type per line
      }
    }
  }

  return elements
}
