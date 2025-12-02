import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Get complete site view data for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { projectId } = await params
    const projectIdInt = parseInt(projectId)

    if (isNaN(projectIdInt)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Get date from query params (optional)
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const selectedDate = dateParam ? new Date(dateParam) : new Date()

    // Get project with all site view related data
    const project = await prisma.project.findUnique({
      where: { id: projectIdInt },
      include: {
        siteCameras: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        siteCaptures: {
          orderBy: { capturedAt: 'desc' },
          take: 100
        },
        tasks: {
          include: {
            elementLinks: true,
            resourceAssignments: {
              include: { resource: true }
            }
          },
          orderBy: { startDate: 'asc' }
        },
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true }
                }
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get daily costs for selected date
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const dailyCosts = await prisma.dailySiteCost.findMany({
      where: {
        projectId: projectIdInt,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    // Get daily progress for selected date
    const dailyProgress = await prisma.dailySiteProgress.findMany({
      where: {
        projectId: projectIdInt,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    // Get total costs summary
    const totalCosts = await prisma.dailySiteCost.aggregate({
      where: { projectId: projectIdInt },
      _sum: { totalCost: true }
    })

    // Calculate overall project progress
    const completedTasks = project.tasks.filter(t => t.progress >= 100).length
    const totalTasks = project.tasks.length
    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Get tasks for today (active tasks)
    const todayTasks = project.tasks.filter(task => {
      if (!task.startDate || !task.endDate) return false
      const start = new Date(task.startDate)
      const end = new Date(task.endDate)
      return selectedDate >= start && selectedDate <= end
    })

    // Get upcoming tasks (next 7 days)
    const nextWeek = new Date(selectedDate)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingTasks = project.tasks.filter(task => {
      if (!task.startDate) return false
      const start = new Date(task.startDate)
      return start > selectedDate && start <= nextWeek
    })

    // Get captures for selected date
    const capturesForDate = project.siteCaptures.filter(capture => {
      const captureDate = new Date(capture.capturedAt)
      return captureDate >= startOfDay && captureDate <= endOfDay
    })

    // Log this view
    await prisma.siteViewLog.create({
      data: {
        projectId: projectIdInt,
        userId: user.id,
        viewType: 'live',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        location: project.location,
        latitude: project.latitude,
        longitude: project.longitude,
        startDate: project.startDate?.toISOString(),
        endDate: project.endDate?.toISOString(),
        status: project.status
      },
      cameras: project.siteCameras.map(cam => ({
        ...cam,
        lastPingAt: cam.lastPingAt?.toISOString(),
        createdAt: cam.createdAt.toISOString()
      })),
      captures: project.siteCaptures.map(cap => ({
        ...cap,
        capturedAt: cap.capturedAt.toISOString(),
        createdAt: cap.createdAt.toISOString()
      })),
      capturesForDate: capturesForDate.map(cap => ({
        ...cap,
        capturedAt: cap.capturedAt.toISOString(),
        createdAt: cap.createdAt.toISOString()
      })),
      selectedDate: selectedDate.toISOString(),
      dailyCosts: dailyCosts.map(cost => ({
        ...cost,
        date: cost.date.toISOString(),
        createdAt: cost.createdAt.toISOString()
      })),
      dailyProgress: dailyProgress.map(prog => ({
        ...prog,
        date: prog.date.toISOString(),
        createdAt: prog.createdAt.toISOString()
      })),
      costSummary: {
        todayTotal: dailyCosts.reduce((sum, c) => sum + c.totalCost, 0),
        projectTotal: totalCosts._sum.totalCost || 0,
        byCategory: dailyCosts.reduce((acc, cost) => {
          acc[cost.category] = (acc[cost.category] || 0) + cost.totalCost
          return acc
        }, {} as Record<string, number>)
      },
      progress: {
        overall: overallProgress,
        completedTasks,
        totalTasks,
        todayTasks: todayTasks.map(t => ({
          id: t.id,
          name: t.name,
          progress: t.progress,
          status: t.status,
          startDate: t.startDate?.toISOString(),
          endDate: t.endDate?.toISOString()
        })),
        upcomingTasks: upcomingTasks.map(t => ({
          id: t.id,
          name: t.name,
          progress: t.progress,
          status: t.status,
          startDate: t.startDate?.toISOString(),
          endDate: t.endDate?.toISOString()
        }))
      },
      team: project.team
    })
  } catch (error) {
    console.error('Site view error:', error)
    return NextResponse.json({ error: 'Failed to fetch site data' }, { status: 500 })
  }
}
