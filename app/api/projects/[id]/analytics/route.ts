import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { differenceInDays } from 'date-fns'

interface TaskData {
  id: number
  progress: number
  startDate: Date | null
  endDate: Date | null
  actualStartDate: Date | null
  actualEndDate: Date | null
  elementLinks: { id: number }[]
}

interface ProgressPoint {
  date: string
  progress: number
}

export async function GET(
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
    const projectId = Number(id)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Verify user access based on team membership
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

    // Fetch project dates (reuse the project we already fetched)
    const projectDates = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        startDate: true,
        endDate: true,
      },
    })

    // Fetch tasks
    const tasks: TaskData[] = await prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        progress: true,
        startDate: true,
        endDate: true,
        actualStartDate: true,
        actualEndDate: true,
        elementLinks: {
          select: { id: true },
        },
      },
    })

    // Models count
    const models = await prisma.model.findMany({
      where: { projectId },
      select: {
        id: true,
        _count: { select: { elements: true } },
      },
    })

    const totalElements = await prisma.element.count({
      where: { model: { projectId } },
    })

    const totalLinks = await prisma.elementTaskLink.count({
      where: { task: { projectId } },
    })

    // Get unique linked elements count
    const linkedElements = await prisma.elementTaskLink.findMany({
      where: { task: { projectId } },
      select: { elementId: true },
      distinct: ['elementId'],
    })
    const linkedElementsCount = linkedElements.length

    // TASK ANALYTICS ---------------------------------

    const totalTasks = tasks.length

    const completedTasks = tasks.filter((task) => Number(task.progress) >= 100).length

    const inProgressTasks = tasks.filter(
      (task) => Number(task.progress) > 0 && Number(task.progress) < 100
    ).length

    const notStartedTasks = tasks.filter((task) => Number(task.progress) === 0).length

    const averageTaskProgress =
      totalTasks > 0
        ? tasks.reduce((sum, task) => sum + Number(task.progress), 0) /
          totalTasks
        : 0

    // PROJECT DURATION ---------------------------------

    const projectDurationDays =
      projectDates?.startDate && projectDates?.endDate
        ? differenceInDays(projectDates.endDate, projectDates.startDate)
        : 0

    // PROGRESS OVER TIME ---------------------------------

    const progressOverTime: ProgressPoint[] = []

    if (projectDates?.startDate && projectDates?.endDate) {
      const currentDate = new Date(projectDates.startDate)

      while (currentDate <= projectDates.endDate) {
        const tasksUpToDate = tasks.filter(
          (t) => t.startDate && t.startDate <= currentDate
        )

        const currentProgress =
          tasksUpToDate.length > 0
            ? tasksUpToDate.reduce(
                (sum, t) => sum + Number(t.progress),
                0
              ) / tasksUpToDate.length
            : 0

        progressOverTime.push({
          date: currentDate.toISOString().split('T')[0],
          progress: Number(currentProgress.toFixed(2)),
        })

        currentDate.setDate(currentDate.getDate() + 7) // weekly
      }
    }

    return NextResponse.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      averageTaskProgress: Number(averageTaskProgress.toFixed(2)),
      totalModels: models.length,
      totalElements,
      totalLinks,
      linkedElementsCount,
      projectDurationDays,
      progressOverTime,
    })
  } catch (error) {
    console.error('Get analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
