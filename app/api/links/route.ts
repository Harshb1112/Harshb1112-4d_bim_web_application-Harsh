import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// Types
interface CreateLinkBody {
  elementIds: number[]
  taskId: number
  linkType?: string
  status?: string
  startDate?: string | null
  endDate?: string | null
}

interface DeleteLinkBody {
  linkIds: number[]
}

// ---------------------------------------------------
// GET all links for a project
// ---------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify user has access to project based on team membership
    const project = await prisma.project.findFirst({
      where: {
        id: Number(projectId),
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: {
                    userId: user.id
                  }
                }
              }
            })
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    const links = await prisma.elementTaskLink.findMany({
      where: {
        task: {
          projectId: Number(projectId),
        },
      },
      include: {
        element: true,
        task: true,
      },
    })

    return NextResponse.json({ links })
  } catch (error) {
    console.error('Get links error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      projectId: searchParams.get('projectId')
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------
// POST: Create new links
// ---------------------------------------------------
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

    const body = (await request.json()) as CreateLinkBody
    const { elementIds, taskId, linkType, status, startDate, endDate } = body

    if (!elementIds || !Array.isArray(elementIds) || !taskId) {
      return NextResponse.json(
        { error: 'Element IDs (array) and Task ID are required' },
        { status: 400 }
      )
    }

    // Verify user has access to the task's project
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check team-based access
    if (user.role !== 'admin' && user.role !== 'manager') {
      const hasAccess = await prisma.project.findFirst({
        where: {
          id: task.projectId,
          team: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        }
      })

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const createData = elementIds.map((elementId: number) => ({
      elementId,
      taskId,
      linkType: linkType ?? 'construction',
      status: status ?? 'planned',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    }))

    await prisma.elementTaskLink.createMany({
      data: createData,
      skipDuplicates: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Links created successfully',
    })
  } catch (error) {
    console.error('Create links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------
// DELETE: Delete links by ID list
// ---------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = (await request.json()) as DeleteLinkBody
    const { linkIds } = body

    if (!linkIds || !Array.isArray(linkIds)) {
      return NextResponse.json(
        { error: 'An array of link IDs is required' },
        { status: 400 }
      )
    }

    // Verify user has access to delete these links
    if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'team_leader') {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    await prisma.elementTaskLink.deleteMany({
      where: {
        id: {
          in: linkIds,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Links deleted successfully',
    })
  } catch (error) {
    console.error('Delete links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
