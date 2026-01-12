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

    // Fetch all user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        teamMemberships: {
          include: {
            team: true
          }
        },
        createdProjects: {
          include: {
            tasks: true,
            models: true
          }
        },
        assignedTasks: {
          include: {
            project: true
          }
        },
        activityLogs: true,
        loginSessions: true,
        notifications: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            createdAt: true,
            lastUsedAt: true,
            isActive: true
          }
        },
        integrations: {
          select: {
            id: true,
            type: true,
            name: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove sensitive data
    const exportData = {
      profile: {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt,
        profileImage: userData.profileImage
      },
      settings: {
        emailNotifications: userData.emailNotifications,
        taskNotifications: userData.taskNotifications,
        projectNotifications: userData.projectNotifications,
        weeklyDigest: userData.weeklyDigest,
        twoFactorEnabled: userData.twoFactorEnabled,
        language: userData.language,
        timezone: userData.timezone,
        dateFormat: userData.dateFormat
      },
      teams: userData.teamMemberships.map(tm => ({
        teamName: tm.team.name,
        role: tm.role,
        seniority: tm.seniority,
        joinedAt: tm.createdAt
      })),
      projects: userData.createdProjects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        createdAt: p.createdAt,
        tasksCount: p.tasks.length,
        modelsCount: p.models.length
      })),
      tasks: userData.assignedTasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        startDate: t.startDate,
        endDate: t.endDate,
        projectName: t.project.name
      })),
      activityLogs: userData.activityLogs.map(log => ({
        action: log.action,
        details: log.details,
        timestamp: log.timestamp
      })),
      loginSessions: userData.loginSessions.map(session => ({
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        browser: session.browser,
        location: session.location,
        ipAddress: session.ipAddress,
        lastActive: session.lastActive,
        createdAt: session.createdAt
      })),
      notifications: userData.notifications.map(n => ({
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        createdAt: n.createdAt
      })),
      apiKeys: userData.apiKeys,
      integrations: userData.integrations,
      exportedAt: new Date().toISOString()
    }

    // Return as JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="4dbim-data-export-${user.id}-${Date.now()}.json"`
      }
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
