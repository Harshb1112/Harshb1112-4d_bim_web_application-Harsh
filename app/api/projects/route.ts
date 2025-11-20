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

    const projects = await prisma.project.findMany({
      where: {
        projectUsers: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        _count: {
          select: {
            tasks: true,
            models: true
          }
        },
        projectUsers: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const { name, description, startDate, endDate } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: user.id,
        projectUsers: {
          create: {
            userId: user.id,
            role: 'admin'
          }
        }
      },
      include: {
        _count: {
          select: {
            tasks: true,
            models: true
          }
        }
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: project.id,
        action: 'PROJECT_CREATED',
        details: { projectName: name }
      }
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}