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

    // Get or create a model for this project (with caching)
    let model = await withRetry(() => prisma.model.findFirst({
      where: { projectId: parseInt(projectId) },
      select: { id: true, name: true } // Only select needed fields
    }))

    if (!model) {
      // Create a default model if none exists
      model = await withRetry(() => prisma.model.create({
        data: {
          projectId: parseInt(projectId),
          name: 'Default Model',
          uploadedBy: userId,
          format: 'speckle'
        },
        select: { id: true, name: true }
      }))
    }

    // Create task with element links - OPTIMIZED for bulk operations
    console.log(`[Task Creation] Creating task with ${elementIds.length} element links...`)
    
    // Step 1: Create the task FIRST (faster)
    console.log('[Task Creation] Step 1: Creating task...')
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
        progress: 0
      }
    }))
    console.log('[Task Creation] Task created:', task.id)
    
    // Step 2: Handle element links FAST with optimized batching
    if (elementIds.length > 0) {
      console.log('[Task Creation] Step 2: Fast element linking...')
      
      // Process in background with larger batches for speed
      setImmediate(async () => {
        const startTime = Date.now()
        try {
          // Batch size optimization: larger batches = faster processing
          const BATCH_SIZE = 2000 // Increased from 1000
          
          // Step 2a: Find existing elements in one query
          const existingElements = await prisma.element.findMany({
            where: { guid: { in: elementIds } },
            select: { id: true, guid: true }
          })
          
          const existingGuids = new Set(existingElements.map(e => e.guid))
          const newGuids = elementIds.filter(id => !existingGuids.has(id))
          
          // Step 2b: Batch create new elements (if any)
          if (newGuids.length > 0) {
            console.log(`[Task Creation] Creating ${newGuids.length} new elements...`)
            for (let i = 0; i < newGuids.length; i += BATCH_SIZE) {
              const batch = newGuids.slice(i, i + BATCH_SIZE)
              await prisma.element.createMany({
                data: batch.map(guid => ({
                  guid,
                  modelId: model.id,
                  category: 'BIM Element'
                })),
                skipDuplicates: true
              })
              console.log(`[Task Creation] Created batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(newGuids.length/BATCH_SIZE)}`)
            }
          }
          
          // Step 2c: Get all element IDs in one query
          const allElements = await prisma.element.findMany({
            where: { guid: { in: elementIds } },
            select: { id: true }
          })
          
          // Step 2d: Batch create element links FAST
          console.log(`[Task Creation] Creating ${allElements.length} element links...`)
          for (let i = 0; i < allElements.length; i += BATCH_SIZE) {
            const batch = allElements.slice(i, i + BATCH_SIZE)
            await prisma.elementTaskLink.createMany({
              data: batch.map(element => ({
                taskId: task.id,
                elementId: element.id,
                linkType: 'construction',
                status: 'planned'
              })),
              skipDuplicates: true
            })
            console.log(`[Task Creation] Linked batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allElements.length/BATCH_SIZE)}`)
          }
          
          const duration = ((Date.now() - startTime) / 1000).toFixed(2)
          console.log(`[Task Creation] ✅ COMPLETE: ${allElements.length} elements linked in ${duration}s`)
        } catch (bgError) {
          console.error('[Task Creation] Background linking error:', bgError)
        }
      })
      
      console.log('[Task Creation] Fast element linking started (background)')
    }
    
    // Step 3: Fetch the task with basic relations (element links will be processed in background)
    console.log('[Task Creation] Step 3: Fetching task data...')
    const completeTask = await withRetry(() => prisma.task.findUnique({
      where: { id: task.id },
      include: {
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
    
    // 🔔 AUTOMATIC NOTIFICATION: Send notification if task is assigned
    if (assigneeId && parseInt(assigneeId) !== userId) {
      try {
        const { createNotification } = await import('@/lib/create-notification')
        const assignerUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { fullName: true }
        })
        
        await createNotification({
          userId: parseInt(assigneeId),
          type: 'task_assigned',
          title: '📋 New Task Assigned',
          body: `${assignerUser?.fullName || 'Someone'} assigned you: ${name}`,
          url: `/dashboard/tasks`
        })
        console.log('[Task Creation] ✅ Notification sent to user:', assigneeId)
      } catch (notifError) {
        console.error('[Task Creation] Failed to send notification:', notifError)
        // Don't fail task creation if notification fails
      }
    }

    console.log('[Task Creation] ✅ Task created instantly, elements linking in background')
    
    return NextResponse.json({
      success: true,
      task: completeTask,
      message: elementIds.length > 0 
        ? `✅ Task created! ${elementIds.length} elements are being linked (takes ~${Math.ceil(elementIds.length/100)}s)`
        : '✅ Task created successfully!'
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
