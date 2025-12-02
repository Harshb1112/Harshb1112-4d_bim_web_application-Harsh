import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Get daily progress entries
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

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereClause: any = { projectId: projectIdInt }

    if (date) {
      const selectedDate = new Date(date)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)
      whereClause.date = { gte: startOfDay, lte: endOfDay }
    } else if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const progressEntries = await prisma.dailySiteProgress.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    })

    // Get summary stats
    const totalWorkers = await prisma.dailySiteProgress.aggregate({
      where: { projectId: projectIdInt },
      _sum: { workersCount: true },
      _avg: { hoursWorked: true }
    })

    return NextResponse.json({
      progress: progressEntries.map(p => ({
        ...p,
        date: p.date.toISOString(),
        createdAt: p.createdAt.toISOString()
      })),
      summary: {
        totalWorkerDays: totalWorkers._sum.workersCount || 0,
        avgHoursPerDay: totalWorkers._avg.hoursWorked || 0
      }
    })
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

// POST - Add a daily progress entry
export async function POST(
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
    if (!user || !['admin', 'manager', 'team_leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { projectId } = await params
    const projectIdInt = parseInt(projectId)
    const body = await request.json()

    const progress = await prisma.dailySiteProgress.create({
      data: {
        projectId: projectIdInt,
        date: new Date(body.date),
        workDescription: body.workDescription,
        teamName: body.teamName,
        workersCount: body.workersCount,
        hoursWorked: body.hoursWorked,
        progressPercent: body.progressPercent,
        weather: body.weather,
        issues: body.issues,
        notes: body.notes
      }
    })

    return NextResponse.json({ progress }, { status: 201 })
  } catch (error) {
    console.error('Create progress error:', error)
    return NextResponse.json({ error: 'Failed to create progress entry' }, { status: 500 })
  }
}
