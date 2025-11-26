import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)

    // Get all progress logs for this project's tasks
    const progressLogs = await prisma.progressLog.findMany({
      where: {
        task: {
          projectId: projectId
        }
      },
      orderBy: {
        reportDate: 'asc'
      },
      select: {
        reportDate: true,
        percentComplete: true,
        taskId: true
      }
    })

    // Group by week and calculate average progress
    const weeklyProgress = new Map<string, { total: number; count: number }>()
    
    progressLogs.forEach(log => {
      const date = new Date(log.reportDate)
      // Get start of week (Monday)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay() + 1)
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!weeklyProgress.has(weekKey)) {
        weeklyProgress.set(weekKey, { total: 0, count: 0 })
      }
      
      const week = weeklyProgress.get(weekKey)!
      week.total += Number(log.percentComplete)
      week.count += 1
    })

    // Convert to timeline array
    const timeline = Array.from(weeklyProgress.entries())
      .map(([date, data]) => ({
        date,
        progress: Math.round((data.total / data.count) * 10) / 10
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7) // Last 7 weeks

    // If no progress logs, calculate from current task progress
    if (timeline.length === 0) {
      const tasks = await prisma.task.findMany({
        where: { projectId },
        select: { progress: true }
      })

      if (tasks.length > 0) {
        const avgProgress = tasks.reduce((sum, t) => sum + Number(t.progress || 0), 0) / tasks.length
        
        // Generate last 7 weeks with current progress
        const now = new Date()
        for (let i = 6; i >= 0; i--) {
          const weekDate = new Date(now)
          weekDate.setDate(weekDate.getDate() - (i * 7))
          weekDate.setDate(weekDate.getDate() - weekDate.getDay() + 1) // Monday
          
          timeline.push({
            date: weekDate.toISOString().split('T')[0],
            progress: Math.round(avgProgress * 10) / 10
          })
        }
      }
    }

    return NextResponse.json({ timeline })
  } catch (error) {
    console.error('Error fetching progress timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress timeline' },
      { status: 500 }
    )
  }
}
