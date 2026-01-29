import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { XMLParser } from 'fast-xml-parser'

// Parse MS Project XML format
function parseMSProjectXML(xmlContent: string): any[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const result = parser.parse(xmlContent)
  
  const tasks: any[] = []
  const projectTasks = result?.Project?.Tasks?.Task || []
  const taskArray = Array.isArray(projectTasks) ? projectTasks : [projectTasks]
  
  for (const task of taskArray) {
    if (!task.Name || task.Name === '') continue
    
    // Parse duration (format: PT8H0M0S or similar)
    let durationDays = null
    if (task.Duration) {
      const durationStr = task.Duration.toString()
      const hours = parseInt(durationStr.replace(/[^\d]/g, '')) || 0
      durationDays = hours / 8 // Convert hours to days (8 hours = 1 day)
    }
    
    // Parse dates
    let startDate = null
    let endDate = null
    if (task.Start) {
      try {
        startDate = new Date(task.Start)
        if (isNaN(startDate.getTime())) startDate = null
      } catch {
        startDate = null
      }
    }
    if (task.Finish) {
      try {
        endDate = new Date(task.Finish)
        if (isNaN(endDate.getTime())) endDate = null
      } catch {
        endDate = null
      }
    }
    
    // Parse progress
    const progress = task.PercentComplete ? parseInt(task.PercentComplete) : 0
    
    // Determine status
    let status = 'todo'
    if (progress >= 100) status = 'completed'
    else if (progress > 0) status = 'in_progress'
    
    tasks.push({
      uid: task.UID ? parseInt(task.UID) : null,
      name: task.Name,
      startDate,
      endDate,
      durationDays,
      progress,
      status,
      description: task.Notes || null,
      outlineLevel: task.OutlineLevel ? parseInt(task.OutlineLevel) : 1,
      predecessors: task.PredecessorLink ? (Array.isArray(task.PredecessorLink) ? task.PredecessorLink : [task.PredecessorLink]) : []
    })
  }
  
  return tasks
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = parseInt(params.id)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: user.id },
          { projectUsers: { some: { userId: user.id } } }
        ]
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xml')) {
      return NextResponse.json({ error: 'Only XML files are supported' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const textContent = new TextDecoder().decode(buffer)
    
    // Parse MS Project XML
    let parsedTasks: any[] = []
    try {
      parsedTasks = parseMSProjectXML(textContent)
    } catch (error) {
      console.error('XML parsing error:', error)
      return NextResponse.json({ error: 'Failed to parse XML file' }, { status: 400 })
    }

    if (parsedTasks.length === 0) {
      return NextResponse.json({ error: 'No valid tasks found in file' }, { status: 400 })
    }

    // Delete existing tasks for this project (dependencies will cascade delete)
    await prisma.task.deleteMany({ where: { projectId } })

    // Create tasks first (without dependencies)
    const taskMap = new Map<number, number>() // Map UID to database ID
    let created = 0

    for (const task of parsedTasks) {
      try {
        const { uid, predecessors, outlineLevel, ...taskData } = task
        
        const createdTask = await prisma.task.create({
          data: {
            projectId,
            ...taskData
          }
        })
        
        if (uid) {
          taskMap.set(uid, createdTask.id)
        }
        created++
      } catch (error) {
        console.error('Failed to create task:', task.name, error)
      }
    }

    // Create dependencies
    let dependenciesCreated = 0
    for (const task of parsedTasks) {
      if (!task.uid || !task.predecessors || task.predecessors.length === 0) continue
      
      const taskId = taskMap.get(task.uid)
      if (!taskId) continue

      for (const pred of task.predecessors) {
        const predecessorUID = pred.PredecessorUID ? parseInt(pred.PredecessorUID) : null
        if (!predecessorUID) continue

        const predecessorId = taskMap.get(predecessorUID)
        if (!predecessorId) continue

        try {
          await prisma.dependency.create({
            data: {
              predecessorId,
              successorId: taskId,
              type: pred.Type || 'FS' // Finish-to-Start is default
            }
          })
          dependenciesCreated++
        } catch (error) {
          console.error('Failed to create dependency:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${created} tasks and ${dependenciesCreated} dependencies`,
      count: created,
      dependencies: dependenciesCreated
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import MS Project file' },
      { status: 500 }
    )
  }
}
