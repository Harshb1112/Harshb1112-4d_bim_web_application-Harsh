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

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const where: any = {
      resource: { projectId: parseInt(projectId) }
    }
    if (resourceId) {
      where.resourceId = parseInt(resourceId)
    }

    const assignments = await prisma.resourceAssignment.findMany({
      where,
      include: {
        resource: { select: { id: true, name: true, type: true, hourlyRate: true, dailyRate: true } },
        task: { select: { id: true, name: true, startDate: true, endDate: true, status: true } }
      },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Get assignments error:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await request.json()
    const { resourceId, taskId, quantity, startDate, endDate, hoursPerDay } = body

    if (!resourceId || !taskId) {
      return NextResponse.json({ error: 'Resource and Task IDs required' }, { status: 400 })
    }

    // Get resource and task details for cost calculation
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } })
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!resource || !task) {
      return NextResponse.json({ error: 'Resource or Task not found' }, { status: 404 })
    }

    // Use task dates if not provided
    const assignStartDate = startDate ? new Date(startDate) : (task.startDate || new Date())
    const assignEndDate = endDate ? new Date(endDate) : (task.endDate || new Date())

    const assignment = await prisma.resourceAssignment.create({
      data: {
        resourceId,
        taskId,
        quantity: quantity || 1,
        startDate: assignStartDate,
        endDate: assignEndDate,
        hoursPerDay: hoursPerDay || 8,
        status: 'active'
      },
      include: {
        resource: true,
        task: true
      }
    })

    // Calculate and create automatic cost entry
    const qty = quantity || 1
    const hrs = hoursPerDay || 8
    const hourlyRate = resource.hourlyRate ? Number(resource.hourlyRate) : 0
    const dailyRate = resource.dailyRate ? Number(resource.dailyRate) : (hourlyRate * 8)
    
    // Calculate number of days
    const days = Math.max(1, Math.ceil((assignEndDate.getTime() - assignStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    
    // Calculate total cost
    let totalCost = 0
    let unitCost = 0
    
    if (resource.type === 'material') {
      // For materials: quantity × daily rate (unit price)
      unitCost = dailyRate
      totalCost = qty * dailyRate
    } else {
      // For labor/equipment: quantity × hours × hourly rate × days OR quantity × daily rate × days
      if (hourlyRate > 0) {
        unitCost = hourlyRate
        totalCost = qty * hrs * hourlyRate * days
      } else {
        unitCost = dailyRate
        totalCost = qty * dailyRate * days
      }
    }

    // Create cost entry automatically
    if (totalCost > 0) {
      await prisma.resourceCost.create({
        data: {
          resourceId,
          date: assignStartDate,
          hours: resource.type !== 'material' ? hrs * days : null,
          quantity: qty,
          unitCost,
          totalCost,
          notes: `Auto-generated: ${qty} ${resource.name} for ${task.name} (${days} days)`
        }
      })
    }

    return NextResponse.json({ 
      assignment, 
      cost: { totalCost, days, unitCost },
      message: `Assignment created with ₹${totalCost.toLocaleString()} cost tracked` 
    })
  } catch (error) {
    console.error('Create assignment error:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
  }
}
