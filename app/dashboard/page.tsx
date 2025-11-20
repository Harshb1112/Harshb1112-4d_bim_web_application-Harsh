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

async function getDashboardData(userId: number) {
  // Get user's projects
  const projects = await prisma.project.findMany({
    where: {
      projectUsers: {
        some: {
          userId: userId
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
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Get recent activity
  const activities = await prisma.activityLog.findMany({
    where: {
      project: {
        projectUsers: {
          some: {
            userId: userId
          }
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

  return { projects, activities }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const { projects, activities } = await getDashboardData(user.id)

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
              <ProjectGrid projects={projects} />
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