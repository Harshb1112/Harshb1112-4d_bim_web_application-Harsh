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

    let tasks

    if (user.role === 'admin') {
      // Admin sees all tasks
      tasks = await prisma.task.findMany({
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      })
    } else if (user.role === 'manager') {
      // Manager sees tasks from their teams
      tasks = await prisma.task.findMany({
        where: {
          project: {
            createdById: user.id
          }
        },
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      })
    } else if (user.role === 'team_leader') {
      // Team leader sees their team's tasks
      tasks = await prisma.task.findMany({
        where: {
          team: {
            members: {
              some: {
                userId: user.id,
                role: 'leader'
              }
            }
          }
        },
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      })
    } else {
      // Members see only their tasks
      tasks = await prisma.task.findMany({
        where: {
          assigneeId: user.id
        },
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Get all tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
