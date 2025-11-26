import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await params
    const taskId = parseInt(id)

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        elementLinks: {
          include: {
            element: true
          }
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        team: {
          include: {
            members: true
          }
        },
        project: {
          include: {
            team: {
              include: {
                members: true
              }
            }
          }
        },
        children: true,
        predecessors: true,
        successors: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check access based on role
    let hasAccess = false
    
    if (user.role === 'admin') {
      hasAccess = true
    } else if (user.role === 'manager') {
      hasAccess = true
    } else if (user.role === 'team_leader') {
      if (task.project.teamLeaderId === user.id) {
        hasAccess = true
      } else if (task.project.team?.members.some(m => m.userId === user.id && m.role === 'leader')) {
        hasAccess = true
      }
    } else if (user.role === 'member' || user.role === 'viewer') {
      // Member/Viewer can view tasks in their team
      if (task.project.team?.members.some(m => m.userId === user.id)) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this task' },
        { status: 403 }
      )
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await params
    const taskId = parseInt(id)
    const body = await req.json()

    // Verify task exists and user has access
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        project: {
          include: {
            team: {
              include: {
                members: true
              }
            }
          }
        }
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check access based on role
    let hasAccess = false
    
    if (user.role === 'admin') {
      // Admin has access to all tasks
      hasAccess = true
    } else if (user.role === 'manager') {
      // Manager has access to all tasks
      hasAccess = true
    } else if (user.role === 'team_leader') {
      // Team leader has access to their team's tasks
      if (existingTask.project.teamLeaderId === user.id) {
        hasAccess = true
      } else if (existingTask.project.team?.members.some(m => m.userId === user.id && m.role === 'leader')) {
        hasAccess = true
      }
    } else if (user.role === 'member' || user.role === 'viewer') {
      // Member/Viewer can only update their own assigned tasks
      if (existingTask.assigneeId === user.id) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this task' },
        { status: 403 }
      )
    }

    // Update task
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.progress !== undefined) updateData.progress = body.progress
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId ? parseInt(body.assigneeId) : null
    if (body.teamId !== undefined) updateData.teamId = body.teamId ? parseInt(body.teamId) : null

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        elementLinks: {
          include: {
            element: true
          }
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        team: true
      }
    })

    // Log progress update if progress changed
    if (body.progress !== undefined) {
      await prisma.progressLog.create({
        data: {
          taskId,
          reportDate: new Date(),
          percentComplete: body.progress,
          updatedBy: user.id,
          note: body.progressNote || 'Progress updated'
        }
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: existingTask.projectId,
        action: 'task_updated',
        details: {
          taskId,
          taskName: updatedTask.name,
          changes: Object.keys(updateData)
        }
      }
    })

    return NextResponse.json({
      success: true,
      task: updatedTask
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await params
    const taskId = parseInt(id)

    // Verify task exists and user has access
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            team: {
              include: {
                members: true
              }
            }
          }
        }
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check access - only admin, manager, and team leader can delete
    let hasAccess = false
    
    if (user.role === 'admin') {
      hasAccess = true
    } else if (user.role === 'manager') {
      hasAccess = true
    } else if (user.role === 'team_leader') {
      if (existingTask.project.teamLeaderId === user.id) {
        hasAccess = true
      } else if (existingTask.project.team?.members.some(m => m.userId === user.id && m.role === 'leader')) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to delete this task' },
        { status: 403 }
      )
    }

    // Delete task (cascade will handle related records)
    await prisma.task.delete({
      where: { id: taskId }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: existingTask.projectId,
        action: 'task_deleted',
        details: {
          taskId,
          taskName: existingTask.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
