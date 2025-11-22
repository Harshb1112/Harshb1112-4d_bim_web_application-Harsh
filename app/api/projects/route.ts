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

    let projects

    if (user.role === 'admin' || user.role === 'manager') {
      // Admin and Manager see all projects
      projects = await prisma.project.findMany({
        include: {
          _count: {
            select: {
              tasks: true,
              models: true
            }
          },
          team: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          teamLeader: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else if (user.role === 'team_leader') {
      // Team Leader sees only their team's projects
      projects = await prisma.project.findMany({
        where: {
          OR: [
            {
              team: {
                members: {
                  some: {
                    userId: user.id,
                    role: 'leader'
                  }
                }
              }
            },
            {
              teamLeaderId: user.id
            }
          ]
        },
        include: {
          _count: {
            select: {
              tasks: true,
              models: true
            }
          },
          team: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          teamLeader: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else {
      // Viewer and team members see only their team's projects
      projects = await prisma.project.findMany({
        where: {
          team: {
            members: {
              some: {
                userId: user.id
              }
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
          team: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

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

    // Only admin and manager can create projects
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Only admin and manager can create projects' }, { status: 403 })
    }

    const { name, description, startDate, endDate, teamId, teamLeaderId } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team assignment is required' },
        { status: 400 }
      )
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // If teamLeaderId provided, verify they are a leader of that team
    if (teamLeaderId) {
      const leaderMembership = await prisma.teamMembership.findFirst({
        where: {
          userId: teamLeaderId,
          teamId,
          role: 'leader'
        }
      })

      if (!leaderMembership) {
        return NextResponse.json({ error: 'Invalid team leader for this team' }, { status: 400 })
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: user.id,
        teamId,
        teamLeaderId
      },
      include: {
        _count: {
          select: {
            tasks: true,
            models: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            fullName: true,
            email: true
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
        details: { projectName: name, teamId, teamLeaderId }
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