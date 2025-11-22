import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function PUT(
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
    const taskId = parseInt(id)
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const { progress, actualStartDate, actualEndDate } = await request.json()

    // Find the task to get the project ID
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify user has access to the project (admin, manager, or team leader)
    if (user.role !== 'admin' && user.role !== 'manager') {
      const project = await prisma.project.findFirst({
        where: {
          id: task.projectId,
          team: {
            members: {
              some: {
                userId: user.id,
                role: 'leader'
              }
            }
          }
        }
      })
      
      if (!project) {
        return NextResponse.json({ error: 'Forbidden: Only admins, managers, or team leaders can update task progress' }, { status: 403 })
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        progress,
        actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: task.projectId,
        action: 'TASK_PROGRESS_UPDATED',
        details: {
          taskName: updatedTask.name,
          progress: updatedTask.progress,
        },
      },
    })

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Update task progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}