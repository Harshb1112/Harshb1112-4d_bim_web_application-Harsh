import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// GET all teams (Admin/Manager see all, Team Leader sees their team only)
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

    let teams

    if (user.role === 'admin' || user.role === 'manager') {
      // Admin and Manager see all teams
      teams = await prisma.team.findMany({
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          projects: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true
            }
          },
          _count: {
            select: {
              members: true,
              projects: true,
              tasks: true
            }
          }
        }
      })
    } else if (user.role === 'team_leader') {
      // Team Leader sees only their team
      teams = await prisma.team.findMany({
        where: {
          members: {
            some: {
              userId: user.id,
              role: 'leader'
            }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          projects: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true
            }
          },
          _count: {
            select: {
              members: true,
              projects: true,
              tasks: true
            }
          }
        }
      })
    } else {
      // Viewer sees teams they're a member of
      teams = await prisma.team.findMany({
        where: {
          members: {
            some: {
              userId: user.id
            }
          }
        },
        include: {
          _count: {
            select: {
              members: true,
              projects: true
            }
          }
        }
      })
    }

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new team (Admin only)
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, code } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const team = await prisma.team.create({
      data: {
        name,
        code
      }
    })

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
