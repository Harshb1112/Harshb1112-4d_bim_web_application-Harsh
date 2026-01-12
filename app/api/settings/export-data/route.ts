import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST - Request data export
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    
    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        assignedTasks: true,
        taskComments: true,
        teamMemberships: {
          include: {
            team: true
          }
        },
        projectUsers: {
          include: {
            project: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove sensitive data
    const exportData = {
      profile: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      settings: {
        language: user.language,
        timezone: user.timezone,
        dateFormat: user.dateFormat,
        emailNotifications: user.emailNotifications,
        taskNotifications: user.taskNotifications,
        projectNotifications: user.projectNotifications,
      },
      tasks: user.assignedTasks,
      comments: user.taskComments,
      teams: user.teamMemberships,
      projects: user.projectUsers,
    }

    return NextResponse.json(exportData)
  } catch (error) {
    console.error('Failed to export data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
