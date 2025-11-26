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
      // Admin and Manager see all teams with all users (including admins/managers)
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

      // Add all admins and managers to each team's member list (for display purposes)
      const allAdminsManagers = await prisma.user.findMany({
        where: {
          role: {
            in: ['admin', 'manager']
          }
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      })

      // Augment each team with admin/manager users
      teams = teams.map(team => {
        const existingMemberIds = team.members.map(m => m.user.id)
        const additionalMembers = allAdminsManagers
          .filter(u => !existingMemberIds.includes(u.id))
          .map(u => ({
            id: -u.id, // Negative ID to indicate virtual membership
            teamId: team.id,
            userId: u.id,
            role: u.role === 'admin' ? 'admin' : 'manager',
            createdAt: new Date(),
            user: u
          }))
        
        return {
          ...team,
          members: [...team.members, ...additionalMembers]
        }
      })
    } else if (user.role === 'team_leader') {
      // Team Leader sees only their team with all users
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

      // Add all admins and managers to team leader's team list
      const allAdminsManagers = await prisma.user.findMany({
        where: {
          role: {
            in: ['admin', 'manager']
          }
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      })

      teams = teams.map(team => {
        const existingMemberIds = team.members.map(m => m.user.id)
        const additionalMembers = allAdminsManagers
          .filter(u => !existingMemberIds.includes(u.id))
          .map(u => ({
            id: -u.id,
            teamId: team.id,
            userId: u.id,
            role: u.role === 'admin' ? 'admin' : 'manager',
            createdAt: new Date(),
            user: u
          }))
        
        return {
          ...team,
          members: [...team.members, ...additionalMembers]
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
