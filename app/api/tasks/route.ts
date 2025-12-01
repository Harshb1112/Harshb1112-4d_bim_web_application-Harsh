import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// Helper function to retry database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      const isConnectionError = lastError.message?.includes('connection pool') || 
                                lastError.message?.includes('Timed out')
      if (!isConnectionError || i === maxRetries - 1) {
        throw error
      }
      console.log(`[DB Retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

// Helper function to check project access
async function checkProjectAccess(userId: number, projectId: number) {
  // Get user info
  const user = await withRetry(() => prisma.user.findUnique({
    where: { id: userId }
  }))

  if (!user) {
    return { hasAccess: false, error: 'User not found' }
  }

  // Get project info
  const project = await withRetry(() => prisma.project.findUnique({
    where: { id: projectId },
    include: {
      projectUsers: {
        where: { userId }
      },
      team: {
        include: {
          members: {
            where: { userId }
          }
        }
      }
    }
  }))

  if (!project) {
    return { hasAccess: false, error: 'Project not found' }
  }

  // Check access: creator, admin, manager, team member, or explicit access
  const isCreator = project.createdById === userId
  const isAdmin = user.role === 'admin'
  const isManager = user.role === 'manager'
  const hasExplicitAccess = project.projectUsers.length > 0
  const isTeamMember = project.team?.members ? project.team.members.length > 0 : false

  console.log('[Access Check]', {
    userId,
    projectId,
    userRole: user.role,
    isCreator,
    isAdmin,
    isManager,
    hasExplicitAccess,
    isTeamMember,
    projectCreatedBy: project.createdById,
    teamId: project.teamId,
    projectExists: !!project
  })

  // Admin and Manager have access to all projects
  if (isAdmin || isManager) {
    console.log('[Access Check] ✅ Access granted: Admin/Manager')
    return { hasAccess: true, user, project }
  }

  // Creator has access to their own projects
  if (isCreator) {
    console.log('[Access Check] ✅ Access granted: Creator')
    return { hasAccess: true, user, project }
  }

  // Explicit project access or team member
  if (hasExplicitAccess || isTeamMember) {
    console.log('[Access Check] ✅ Access granted: Project member or team member')
    return { hasAccess: true, user, project }
  }

  console.log('[Access Check] ❌ Access denied')
  return { hasAccess: false, error: 'Access denied to this project' }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const userId = user.id

    const body = await req.json()
    const {
      projectId,
      name,
      description,
      startDate,
      endDate,
      assigneeId,
      teamId,
      priority,
      status,
      elementIds = []
    } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and task name are required' },
        { status: 400 }
      )
    }

    // Verify user has access to project
    const accessCheck = await checkProjectAccess(userId, parseInt(projectId))
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.error || 'Access denied' },
        { status: 403 }
      )
    }

    // Get or create a model for this project
    let model = await withRetry(() => prisma.model.findFirst({
      where: { projectId: parseInt(projectId) }
    }))

    if (!model) {
      // Create a default model if none exists
      model = await withRetry(() => prisma.model.create({
        data: {
          projectId: parseInt(projectId),
          name: 'Default Model',
          uploadedBy: userId,
          format: 'speckle'
        }
      }))
    }

    // Create task with element links
    const task = await withRetry(() => prisma.task.create({
      data: {
        projectId: parseInt(projectId),
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        assigneeId: assigneeId ? parseInt(assigneeId) : null,
        teamId: teamId ? parseInt(teamId) : null,
        priority: priority || 'medium',
        status: status || 'todo',
        progress: 0,
        // Create element links if elementIds provided
        elementLinks: elementIds.length > 0 ? {
          create: elementIds.map((elementId: string) => ({
            element: {
              connectOrCreate: {
                where: { guid: elementId },
                create: {
                  guid: elementId,
                  modelId: model.id,
                  category: 'BIM Element'
                }
              }
            },
            linkType: 'construction',
            status: 'planned'
          }))
        } : undefined
      },
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
    }))

    // Log activity
    await withRetry(() => prisma.activityLog.create({
      data: {
        userId,
        projectId: parseInt(projectId),
        action: 'task_created',
        details: {
          taskId: task.id,
          taskName: task.name,
          elementCount: elementIds.length
        }
      }
    }))

    return NextResponse.json({
      success: true,
      task
    })
  } catch (error) {
    console.error('Error creating task:', error)
    
    // Provide more detailed error message
    let errorMessage = 'Failed to create task'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      console.log('[Tasks API] No token found')
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      console.log('[Tasks API] Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const userId = user.id
    console.log('[Tasks API] User:', userId, 'Role:', user.role)

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      console.log('[Tasks API] No projectId provided')
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    console.log('[Tasks API] Fetching tasks for project:', projectId)

    // Verify user has access to project
    const accessCheck = await checkProjectAccess(userId, parseInt(projectId))
    
    if (!accessCheck.hasAccess) {
      console.log('[Tasks API] Access denied for user:', userId, 'project:', projectId)
      return NextResponse.json(
        { error: accessCheck.error || 'Access denied' },
        { status: 403 }
      )
    }

    const tasks = await withRetry(() => prisma.task.findMany({
      where: {
        projectId: parseInt(projectId)
      },
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
        team: true,
        children: true,
        predecessors: true,
        successors: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    console.log('[Tasks API] Found', tasks.length, 'tasks')
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('[Tasks API] Error fetching tasks:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
