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

    // Verify user has access to project based on team membership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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

    // Verify user has admin/manager/team_leader access to project
    if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'team_leader') {
      return NextResponse.json({ error: 'Forbidden: only admins, managers, or team leaders can create tasks' }, { status: 403 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: {
                    userId: user.id,
                    role: 'leader'
                  }
                }
              }
            })
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
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