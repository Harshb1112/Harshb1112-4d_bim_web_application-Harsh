/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import ProjectGrid from '@/components/dashboard/ProjectGrid'
import RecentActivity from '@/components/dashboard/RecentActivity'
import StatsCards from '@/components/dashboard/StatsCards'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  const user = verifyToken(token)
  if (!user) {
    redirect('/login')
  }

  return user
}

async function getDashboardData(userId: number, userRole: string) {
  let projects
  let activities

  if (userRole === 'admin' || userRole === 'manager') {
    // Admin and Manager see all projects
    projects = await prisma.project.findMany({
      include: {
        _count: {
          select: {
            tasks: true,
            models: true
          }
        },
        tasks: {
          select: {
            progress: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get all activity
    activities = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            fullName: true
          }
        },
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    })
  } else if (userRole === 'team_leader') {
    // Team Leader sees only their team's projects
    projects = await prisma.project.findMany({
      where: {
        OR: [
          {
            team: {
              members: {
                some: {
                  userId: userId,
                  role: 'leader'
                }
              }
            }
          },
          {
            teamLeaderId: userId
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
        tasks: {
          select: {
            progress: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get team activity
    const teamMemberships = await prisma.teamMembership.findMany({
      where: {
        userId: userId,
        role: 'leader'
      },
      select: {
        teamId: true
      }
    })
    const teamIds = teamMemberships.map(m => m.teamId)

    activities = await prisma.activityLog.findMany({
      where: {
        project: {
          teamId: {
            in: teamIds
          }
        }
      },
      include: {
        user: {
          select: {
            fullName: true
          }
        },
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    })
  } else {
    // Viewer sees only their team's projects
    projects = await prisma.project.findMany({
      where: {
        team: {
          members: {
            some: {
              userId: userId
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
        tasks: {
          select: {
            progress: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get team activity
    const teamMemberships = await prisma.teamMembership.findMany({
      where: {
        userId: userId
      },
      select: {
        teamId: true
      }
    })
    const teamIds = teamMemberships.map(m => m.teamId)

    activities = await prisma.activityLog.findMany({
      where: {
        project: {
          teamId: {
            in: teamIds
          }
        }
      },
      include: {
        user: {
          select: {
            fullName: true
          }
        },
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    })
  }

  return { projects, activities }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const { projects, activities } = await getDashboardData(user.id, user.role)

  // Calculate stats
  const totalProjects = projects.length
  const totalTasks = projects.reduce((sum: any, project: { _count: { tasks: any } }) => sum + project._count.tasks, 0)
  const totalModels = projects.reduce((sum: any, project: { _count: { models: any } }) => sum + project._count.models, 0)
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum: number, project: { tasks: any[] }) => {
        const projectProgress = project.tasks.length > 0 
          ? project.tasks.reduce((taskSum: number, task: { progress: any }) => taskSum + Number(task.progress), 0) / project.tasks.length
          : 0
        return sum + projectProgress
      }, 0) / projects.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.fullName}
              <span className="ml-3 text-lg font-medium text-blue-600">
                ({user.role === 'admin' ? 'Admin' : 
                  user.role === 'manager' ? 'Manager' : 
                  user.role === 'team_leader' ? 'Team Leader' : 'Member'})
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>

          <StatsCards 
            totalProjects={totalProjects}
            totalTasks={totalTasks}
            totalModels={totalModels}
            avgProgress={avgProgress}
          />

          <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ProjectGrid projects={projects} userRole={user.role} />
            </div>
            <div>
              <RecentActivity activities={activities} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}