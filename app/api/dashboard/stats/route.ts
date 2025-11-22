import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

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

    let stats: any = {}

    if (user.role === 'admin') {
      // Admin sees everything
      const [totalProjects, totalTasks, totalTeams, totalUsers, totalTeamLeaders, totalManagers] = await Promise.all([
        prisma.project.count(),
        prisma.task.count(),
        prisma.team.count(),
        prisma.user.count(),
        prisma.user.count({ where: { role: 'team_leader' } }),
        prisma.user.count({ where: { role: 'manager' } })
      ])

      const projectsByStatus = await prisma.task.groupBy({
        by: ['status'],
        _count: true
      })

      const recentActivity = await prisma.activityLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          },
          project: {
            select: {
              name: true
            }
          }
        }
      })

      stats = {
        totalProjects,
        totalTasks,
        totalTeams,
        totalUsers,
        totalTeamLeaders,
        totalManagers,
        projectsByStatus,
        recentActivity
      }
    } else if (user.role === 'manager') {
      // Manager sees all projects and tasks
      const [totalProjects, totalTasks, totalTeams] = await Promise.all([
        prisma.project.count(),
        prisma.task.count(),
        prisma.team.count()
      ])

      const projectsByStatus = await prisma.task.groupBy({
        by: ['status'],
        _count: true
      })

      const myProjects = await prisma.project.findMany({
        where: {
          createdById: user.id
        },
        select: {
          id: true,
          name: true,
          team: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      })

      const recentActivity = await prisma.activityLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          },
          project: {
            select: {
              name: true
            }
          }
        }
      })

      stats = {
        totalProjects,
        totalTasks,
        totalTeams,
        projectsByStatus,
        myProjects,
        recentActivity
      }
    } else if (user.role === 'team_leader') {
      // Team Leader sees only their team's data
      const teamMemberships = await prisma.teamMembership.findMany({
        where: {
          userId: user.id,
          role: 'leader'
        },
        select: {
          teamId: true
        }
      })

      const teamIds = teamMemberships.map(m => m.teamId)

      const [totalProjects, totalTasks, teamMembers] = await Promise.all([
        prisma.project.count({
          where: {
            teamId: {
              in: teamIds
            }
          }
        }),
        prisma.task.count({
          where: {
            teamId: {
              in: teamIds
            }
          }
        }),
        prisma.teamMembership.count({
          where: {
            teamId: {
              in: teamIds
            }
          }
        })
      ])

      const tasksByStatus = await prisma.task.groupBy({
        by: ['status'],
        where: {
          teamId: {
            in: teamIds
          }
        },
        _count: true
      })

      const myTeamProjects = await prisma.project.findMany({
        where: {
          teamId: {
            in: teamIds
          }
        },
        select: {
          id: true,
          name: true,
          team: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      })

      stats = {
        totalProjects,
        totalTasks,
        teamMembers,
        tasksByStatus,
        myTeamProjects
      }
    } else {
      // Viewer sees limited read-only data
      const teamMemberships = await prisma.teamMembership.findMany({
        where: {
          userId: user.id
        },
        select: {
          teamId: true
        }
      })

      const teamIds = teamMemberships.map(m => m.teamId)

      const [totalProjects, totalTasks] = await Promise.all([
        prisma.project.count({
          where: {
            teamId: {
              in: teamIds
            }
          }
        }),
        prisma.task.count({
          where: {
            teamId: {
              in: teamIds
            }
          }
        })
      ])

      stats = {
        totalProjects,
        totalTasks
      }
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
