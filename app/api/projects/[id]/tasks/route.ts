import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const projectId = parseInt(params.id)

    // Verify user has access to project
    const projectAccess = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: user.id
      }
    })

    if (!projectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId
      },
      include: {
        children: true,
        predecessors: {
          include: {
            predecessor: {
              select: {
                name: true
              }
            }
          }
        },
        successors: {
          include: {
            successor: {
              select: {
                name: true
              }
            }
          }
        },
        elementLinks: {
          include: {
            element: {
              select: {
                guid: true,
                category: true,
                family: true
              }
            }
          }
        }
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const projectId = parseInt(params.id)

    // Verify user has access to project
    const projectAccess = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: user.id
      }
    })

    if (!projectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      name,
      description,
      startDate,
      endDate,
      durationDays,
      parentId,
      color,
      resource
    } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Task name is required' },
        { status: 400 }
      )
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        durationDays,
        parentId,
        color,
        resource
      },
      include: {
        children: true,
        elementLinks: {
          include: {
            element: true
          }
        }
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId,
        action: 'TASK_CREATED',
        details: { taskName: name }
      }
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}