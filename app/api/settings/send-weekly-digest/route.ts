import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendWeeklyDigestEmail } from '@/lib/email-service'

const prisma = new PrismaClient()

// POST - Send weekly digest to all users with it enabled (cron job)
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users with weekly digest enabled
    const users = await prisma.user.findMany({
      where: {
        weeklyDigest: true,
        emailNotifications: true
      },
      include: {
        assignedTasks: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        },
        projectUsers: {
          include: {
            project: true
          }
        }
      }
    })

    const results = []

    for (const user of users) {
      const stats = {
        tasksCompleted: user.assignedTasks.filter(t => t.status === 'done').length,
        tasksInProgress: user.assignedTasks.filter(t => t.status === 'in_progress').length,
        tasksPending: user.assignedTasks.filter(t => t.status === 'todo').length,
        projectsActive: user.projectUsers.filter(pu => pu.project.status === 'active').length
      }

      const result = await sendWeeklyDigestEmail(
        user.email,
        user.fullName,
        stats
      )

      results.push({
        userId: user.id,
        email: user.email,
        success: result.success
      })
    }

    const successCount = results.filter(r => r.success).length

    console.log(`✅ Sent ${successCount}/${users.length} weekly digest emails`)

    return NextResponse.json({ 
      success: true, 
      sent: successCount,
      total: users.length,
      results
    })
  } catch (error) {
    console.error('Failed to send weekly digests:', error)
    return NextResponse.json({ error: 'Failed to send weekly digests' }, { status: 500 })
  }
}
