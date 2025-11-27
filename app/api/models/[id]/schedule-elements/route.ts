import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

// Parse IFC file to extract schedule-related elements
function parseIfcScheduleElements(ifcContent: string) {
  const elements: any[] = []
  const lines = ifcContent.split('\n')
  
  // IFC schedule-related entity types
  const scheduleTypes = [
    'IFCTASK',
    'IFCWORKSCHEDULE',
    'IFCWORKPLAN',
    'IFCWORKTIME',
    'IFCWORKCALENDAR',
    'IFCBUILDINGELEMENT',
    'IFCWALL',
    'IFCWALLSTANDARDCASE',
    'IFCSLAB',
    'IFCSLABSTANDARDCASE',
    'IFCCOLUMN',
    'IFCBEAM',
    'IFCDOOR',
    'IFCWINDOW',
    'IFCROOF',
    'IFCSTAIR',
    'IFCFURNISHINGELEMENT',
    'IFCSPACE',
    'IFCBUILDING',
    'IFCBUILDINGSTOREY'
  ]
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Match IFC entities: #123=IFCWALL('globalId',#owner,'name','description','type',...)
    const match = trimmed.match(/^#(\d+)=(\w+)\((.*)\);?$/)
    if (match) {
      const [, id, type, params] = match
      
      if (scheduleTypes.some(st => type.includes(st))) {
        // Extract parameters - IFC format: 'globalId',#ref,'name','description',...
        const paramMatch = params.match(/'([^']+)'/)
        const globalId = paramMatch ? paramMatch[1] : id
        
        // Try to extract name (usually 3rd or 4th parameter)
        const nameMatches = params.match(/'([^']+)'/g)
        let name = `${type} ${id}`
        let description = undefined
        
        if (nameMatches && nameMatches.length > 1) {
          // Second quoted string is usually the name
          name = nameMatches[1].replace(/'/g, '')
          if (nameMatches.length > 2) {
            description = nameMatches[2].replace(/'/g, '')
          }
        }
        
        elements.push({
          id: `#${id}`,
          globalId: globalId,
          name: name || `${type} ${id}`,
          type: type,
          description: description
        })
      }
    }
  }
  
  return elements
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const modelId = parseInt(id)
    
    if (isNaN(modelId)) {
      return NextResponse.json(
        { error: "Invalid model ID" },
        { status: 400 }
      )
    }

    // Get model from database
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        project: true
      }
    })

    if (!model) {
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 }
      )
    }

    // Check if file exists
    if (!model.filePath) {
      return NextResponse.json(
        { error: "Model file not found" },
        { status: 404 }
      )
    }

    const filePath = path.join(process.cwd(), 'public', model.filePath)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "IFC file not found on disk" },
        { status: 404 }
      )
    }

    // Read and parse IFC file
    const ifcContent = fs.readFileSync(filePath, 'utf-8')
    const elements = parseIfcScheduleElements(ifcContent)

    return NextResponse.json({
      success: true,
      elements,
      count: elements.length
    })

  } catch (error: any) {
    console.error("Error loading schedule elements:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load schedule elements" },
      { status: 500 }
    )
  }
}
