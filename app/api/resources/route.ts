import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

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

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const where: any = { projectId: parseInt(projectId) }
    if (type && type !== 'all') {
      where.type = type
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ resources })
  } catch (error) {
    console.error('Get resources error:', error)
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, name, type, unit, hourlyRate, dailyRate, unitRate, quantity, capacity, description, duration } = body

    if (!projectId || !name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        projectId,
        name,
        type,
        unit: unit || null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        capacity: capacity ? parseInt(capacity) : null,
        description: description || null
      }
    })

    // Calculate and create initial cost entry if rates are provided
    let costEntry = null
    if (quantity && (hourlyRate || dailyRate || unitRate)) {
      const qty = parseFloat(quantity)
      let totalCost = 0
      let unitCost = 0

      // Calculate cost based on available rate
      if (dailyRate) {
        unitCost = parseFloat(dailyRate)
        totalCost = unitCost * qty
      } else if (hourlyRate) {
        unitCost = parseFloat(hourlyRate)
        // Assume 8 hours per day if duration not specified
        const hours = duration ? parseFloat(duration) * 8 : qty * 8
        totalCost = unitCost * hours
      } else if (unitRate) {
        unitCost = parseFloat(unitRate)
        totalCost = unitCost * qty
      }

      // Create cost entry
      if (totalCost > 0) {
        costEntry = await prisma.resourceCost.create({
          data: {
            resourceId: resource.id,
            date: new Date(),
            quantity: qty,
            unitCost: unitCost,
            totalCost: totalCost,
            notes: `Initial cost calculation from AI generation`
          }
        })
      }
    }

    return NextResponse.json({ 
      resource, 
      cost: costEntry,
      message: 'Resource created successfully' 
    })
  } catch (error) {
    console.error('Create resource error:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}
