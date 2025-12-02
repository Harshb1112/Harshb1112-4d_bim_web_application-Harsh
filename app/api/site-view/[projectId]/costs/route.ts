import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Get cost summary and details
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

    const costs = await prisma.dailySiteCost.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    })

    // Get aggregated data
    const totalByCategory = await prisma.dailySiteCost.groupBy({
      by: ['category'],
      where: { projectId: projectIdInt },
      _sum: { totalCost: true }
    })

    const totalCost = await prisma.dailySiteCost.aggregate({
      where: { projectId: projectIdInt },
      _sum: { totalCost: true }
    })

    // Daily totals for chart
    const dailyTotals = await prisma.dailySiteCost.groupBy({
      by: ['date'],
      where: { projectId: projectIdInt },
      _sum: { totalCost: true },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json({
      costs: costs.map(c => ({
        ...c,
        date: c.date.toISOString(),
        createdAt: c.createdAt.toISOString()
      })),
      summary: {
        total: totalCost._sum.totalCost || 0,
        byCategory: totalByCategory.reduce((acc, item) => {
          acc[item.category] = item._sum.totalCost || 0
          return acc
        }, {} as Record<string, number>),
        dailyTotals: dailyTotals.map(d => ({
          date: d.date.toISOString().split('T')[0],
          total: d._sum.totalCost || 0
        }))
      }
    })
  } catch (error) {
    console.error('Get costs error:', error)
    return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 })
  }
}

// POST - Add a cost entry
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

    const cost = await prisma.dailySiteCost.create({
      data: {
        projectId: projectIdInt,
        date: new Date(body.date),
        category: body.category,
        description: body.description,
        quantity: body.quantity,
        unit: body.unit,
        unitCost: body.unitCost,
        totalCost: body.totalCost,
        currency: body.currency || 'INR',
        vendor: body.vendor,
        invoiceRef: body.invoiceRef,
        notes: body.notes
      }
    })

    return NextResponse.json({ cost }, { status: 201 })
  } catch (error) {
    console.error('Create cost error:', error)
    return NextResponse.json({ error: 'Failed to create cost entry' }, { status: 500 })
  }
}
