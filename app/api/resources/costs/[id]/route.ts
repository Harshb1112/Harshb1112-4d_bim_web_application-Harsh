import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const costId = parseInt(id)
    if (isNaN(costId)) {
      return NextResponse.json({ error: 'Invalid cost ID' }, { status: 400 })
    }

    // Check if cost exists
    const cost = await prisma.resourceCost.findUnique({
      where: { id: costId },
      include: {
        resource: {
          include: {
            project: true
          }
        }
      }
    })

    if (!cost) {
      return NextResponse.json({ error: 'Cost entry not found' }, { status: 404 })
    }

    // Check if user has access to the project
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId: cost.resource.projectId,
        userId: user.id
      }
    })

    // Allow if user is part of project or is admin
    if (!projectUser && user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the cost entry
    await prisma.resourceCost.delete({
      where: { id: costId }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Cost entry deleted successfully' 
    })

  } catch (error) {
    console.error('Delete cost error:', error)
    return NextResponse.json(
      { error: 'Failed to delete cost entry' },
      { status: 500 }
    )
  }
}
