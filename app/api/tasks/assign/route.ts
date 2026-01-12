import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { sendTaskAssignmentEmail } from '@/lib/email-service'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST - Assign task to user and send notification
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    const body = await req.json()
    const { taskId, assigneeId } = body

    // Update task with assignee
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId },
      include: {
        project: true,
        assignee: true
      }
    })

    if (!task.assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
    }

    // Check if user has email notifications enabled
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: {
        emailNotifications: true,
        taskNotifications: true,
        email: true,
        fullName: true
      }
    })

    // Send email notification if enabled
    if (assignee?.emailNotifications && assignee?.taskNotifications) {
      const taskUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}`
      
      await sendTaskAssignmentEmail(
        assignee.email,
        assignee.fullName,
        task.name,
        task.project.name,
        taskUrl
      )

      console.log('✅ Task assignment notification sent to:', assignee.email)
    } else {
      console.log('ℹ️ Email notifications disabled for user:', assigneeId)
    }

    return NextResponse.json({ 
      success: true, 
      task,
      notificationSent: assignee?.emailNotifications && assignee?.taskNotifications
    })
  } catch (error) {
    console.error('Failed to assign task:', error)
    return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 })
  }
}
