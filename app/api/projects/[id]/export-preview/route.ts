import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

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
    const projectId = parseInt(id)

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Fetch project with counts
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            assignee: true
          }
        },
        resources: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Calculate preview counts
    const wbsCount = project.tasks.length
    const activitiesCount = project.tasks.length
    
    // Count unique work centers (assigned users)
    const uniqueUsers = new Set(
      project.tasks
        .filter(task => task.assignee)
        .map(task => task.assignee?.id)
    )
    const workCentersCount = uniqueUsers.size

    // Count cost items from resources
    const costItemsCount = project.resources.length

    return NextResponse.json({
      success: true,
      preview: {
        wbsCount,
        activitiesCount,
        workCentersCount,
        costItemsCount
      }
    })
  } catch (error) {
    console.error('Error fetching export preview:', error)
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 500 })
  }
}
