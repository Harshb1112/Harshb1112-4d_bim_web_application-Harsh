import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

async function checkProjectAdminOrManager(userId: number, projectId: number): Promise<boolean> {
  const projectUser = await prisma.projectUser.findFirst({
    where: {
      userId,
      projectId,
      role: { in: ['admin', 'manager'] },
    },
  })
  return !!projectUser
}

// GET a single project by ID
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

    // Team-based access control
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
      },
      include: {
        models: {
          include: {
            _count: {
              select: {
                elements: true
              }
            }
          }
        },
        tasks: {
          include: {
            children: true,
            elementLinks: {
              include: {
                element: true
              }
            }
          }
        },
        projectUsers: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT update project details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Only admins, managers, or team leaders can update project details
    if (user.role !== 'admin' && user.role !== 'manager') {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          team: {
            members: {
              some: {
                userId: user.id,
                role: 'leader'
              }
            }
          }
        }
      })
      
      if (!project) {
        return NextResponse.json({ error: 'Forbidden: Only admins, managers, or team leaders can update project' }, { status: 403 })
      }
    }

    const { name, description, startDate, endDate } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId,
        action: 'PROJECT_UPDATED',
        details: { projectName: updatedProject.name, changes: { name, description, startDate, endDate } },
      },
    })

    return NextResponse.json({ project: updatedProject, message: 'Project updated successfully' })
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}