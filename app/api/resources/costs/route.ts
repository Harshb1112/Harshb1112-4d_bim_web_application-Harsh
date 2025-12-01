import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const resourceId = searchParams.get('resourceId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const where: any = {
      resource: { projectId: parseInt(projectId) }
    }
    if (resourceId) where.resourceId = parseInt(resourceId)
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) }
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) }

    const costs = await prisma.resourceCost.findMany({
      where,
      include: {
        resource: { select: { id: true, name: true, type: true } }
      },
      orderBy: { date: 'desc' }
    })

    // Calculate totals
    const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0)
    const byType = costs.reduce((acc: any, c) => {
      const type = c.resource.type
      acc[type] = (acc[type] || 0) + c.totalCost
      return acc
    }, {})

    return NextResponse.json({ costs, totalCost, byType })
  } catch (error) {
    console.error('Get costs error:', error)
    return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await request.json()
    const { resourceId, date, hours, quantity, unitCost, notes } = body

    if (!resourceId || !date || !unitCost) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const totalCost = (hours || quantity || 1) * unitCost

    const cost = await prisma.resourceCost.create({
      data: {
        resourceId,
        date: new Date(date),
        hours: hours || null,
        quantity: quantity || null,
        unitCost: parseFloat(unitCost),
        totalCost,
        notes: notes || null
      },
      include: { resource: true }
    })

    return NextResponse.json({ cost, message: 'Cost entry created' })
  } catch (error) {
    console.error('Create cost error:', error)
    return NextResponse.json({ error: 'Failed to create cost entry' }, { status: 500 })
  }
}
