/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { parseMSProjectXML } from '@/lib/msproject-parser'

export async function POST(
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
    const projectId = parseInt(id)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Verify user has admin/manager access to project
    const projectAccess = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: user.id,
        role: { in: ['admin', 'manager'] },
      },
    })
    if (!projectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const xmlContent = await file.text()
    const { tasks, dependencies } = parseMSProjectXML(xmlContent)

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No tasks found in the file' }, { status: 400 })
    }

    // Use a transaction to import all tasks and dependencies
    const result = await prisma.$transaction(async (tx) => {
      // Clear existing dependencies first
      const existingTasks = await tx.task.findMany({
        where: { projectId },
        select: { id: true }
      })
      const taskIds = existingTasks.map(t => t.id)
      
      if (taskIds.length > 0) {
        await tx.dependency.deleteMany({ 
          where: { 
            OR: [
              { predecessorId: { in: taskIds } },
              { successorId: { in: taskIds } }
            ]
          } 
        })
      }
      
      // Clear existing tasks for this project
      await tx.task.deleteMany({ where: { projectId } })

      // Create tasks and store their original UIDs
      const uidToDbIdMap = new Map<number, number>()
      for (const taskData of tasks) {
        const createdTask = await tx.task.create({
          data: {
            projectId,
            name: taskData.name,
            startDate: taskData.startDate,
            endDate: taskData.endDate,
            durationDays: taskData.durationDays,
            status: 'todo',
            priority: 'medium',
            progress: 0,
          },
        })
        uidToDbIdMap.set(taskData.uid, createdTask.id)
      }

      // Update parent-child relationships
      for (const taskData of tasks) {
        if (taskData.parentId) {
          const childId = uidToDbIdMap.get(taskData.uid)
          const parentId = uidToDbIdMap.get(taskData.parentId)
          if (childId && parentId) {
            await tx.task.update({
              where: { id: childId },
              data: { parentId },
            })
          }
        }
      }

      // Create dependencies
      const dependencyData = dependencies
        .map(dep => {
          const predecessorId = uidToDbIdMap.get(dep.predecessorUID)
          const successorId = uidToDbIdMap.get(dep.successorUID)
          if (predecessorId && successorId) {
            return {
              predecessorId,
              successorId,
              type: dep.type || 'FS',
            }
          }
          return null
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)

      if (dependencyData.length > 0) {
        await tx.dependency.createMany({
          data: dependencyData,
        })
      }

      return { taskCount: tasks.length, dependencyCount: dependencyData.length }
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId,
        action: 'SCHEDULE_IMPORTED',
        details: {
          fileName: file.name,
          tasksImported: result.taskCount,
          dependenciesImported: result.dependencyCount,
        },
      },
    })

    return NextResponse.json({
      message: `Successfully imported ${result.taskCount} tasks and ${result.dependencyCount} dependencies.`,
    })
  } catch (error) {
    console.error('MS Project import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}