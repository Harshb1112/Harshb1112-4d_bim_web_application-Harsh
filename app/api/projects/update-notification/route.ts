import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { sendProjectUpdateEmail } from '@/lib/email-service'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST - Send project update notification to all team members
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    const body = await req.json()
    const { projectId, updateMessage } = body

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                emailNotifications: true,
                projectNotifications: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const projectUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/projects/${projectId}`
    
    // Send notifications to all team members with notifications enabled
    const notificationPromises = project.projectUsers
      .filter(pu => pu.user.emailNotifications && pu.user.projectNotifications)
      .map(pu => 
        sendProjectUpdateEmail(
          pu.user.email,
          pu.user.fullName,
          project.name,
          updateMessage,
          projectUrl
        )
      )

    const results = await Promise.allSettled(notificationPromises)
    const successCount = results.filter(r => r.status === 'fulfilled').length

    console.log(`✅ Sent ${successCount} project update notifications`)

    return NextResponse.json({ 
      success: true, 
      notificationsSent: successCount,
      totalUsers: project.projectUsers.length
    })
  } catch (error) {
    console.error('Failed to send project update notifications:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
