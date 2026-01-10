// API to fetch all BIM elements from project models
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: Number(projectId),
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: { userId: user.id }
                }
              }
            })
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    // Fetch ALL elements from all models in this project (IFC, Speckle, Autodesk)
    const elements = await prisma.element.findMany({
      where: {
        model: {
          projectId: Number(projectId)
        }
      },
      select: {
        id: true,
        guid: true,
        category: true,
        family: true,
        typeName: true,
        level: true,
        parameters: true,
        modelId: true,
        model: {
          select: {
            name: true,
            source: true,
            format: true,
            sourceUrl: true
          }
        },
        properties: {
          select: {
            key: true,
            value: true
          }
        }
      },
      orderBy: {
        category: 'asc'
      }
    })

    console.log(`✅ Fetched ${elements.length} elements from all model sources for project ${projectId}`)

    // Format elements for AI analysis - works for IFC, Speckle, and Autodesk models
    const formattedElements = elements.map(element => {
      // Convert properties array to object for easier AI analysis
      const propertiesObj: any = {}
      if (element.properties && element.properties.length > 0) {
        element.properties.forEach(prop => {
          propertiesObj[prop.key] = prop.value
        })
      }
      
      // Add parameters if available
      if (element.parameters && typeof element.parameters === 'object') {
        Object.assign(propertiesObj, element.parameters)
      }

      return {
        id: element.id,
        guid: element.guid,
        type: element.category || element.family || 'Unknown',
        name: element.typeName || element.family || 'Unnamed',
        category: element.category,
        family: element.family,
        typeName: element.typeName,
        level: element.level,
        properties: propertiesObj,
        modelName: element.model.name,
        modelSource: element.model.source, // 'local_ifc', 'speckle', 'autodesk_acc', etc.
        modelFormat: element.model.format,
        sourceUrl: element.model.sourceUrl
      }
    })

    return NextResponse.json({
      success: true,
      elements: formattedElements,
      count: formattedElements.length,
      projectId: Number(projectId),
      sources: [...new Set(formattedElements.map(e => e.modelSource))], // List of all sources
      models: [...new Set(formattedElements.map(e => e.modelName))] // List of all models
    })

  } catch (error) {
    console.error('Error fetching elements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch elements' },
      { status: 500 }
    )
  }
}
