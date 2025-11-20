import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { projectId, elementSearchTerm = '', taskSearchTerm = '' } =
      await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Fetch elements
    const elements = await prisma.element.findMany({
      where: {
        model: {
          projectId: Number(projectId),
        },
      },
      select: {
        id: true,
        guid: true,
        category: true,
        family: true,
        typeName: true,
        parameters: true,
      },
    })

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where: {
        projectId: Number(projectId),
      },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
      },
    })

    // Fetch existing links
    const existingLinks = await prisma.elementTaskLink.findMany({
      where: {
        task: {
          projectId: Number(projectId),
        },
      },
      select: {
        elementId: true,
        taskId: true,
      },
    })

    // Type: element-task link
    const existingLinkSet = new Set(
      existingLinks.map((link: { elementId: number; taskId: number }) => 
        `${link.elementId}-${link.taskId}`
      )
    )

    // Output structure
    const suggestedLinks: {
      elementId: number
      taskId: number
      reason: string
    }[] = []

    // Search keywords
    const elementKeywords: string[] = elementSearchTerm
      .toLowerCase()
      .split(' ')
      .filter((k: string) => k)

    const taskKeywords: string[] = taskSearchTerm
      .toLowerCase()
      .split(' ')
      .filter((k: string) => k)

    // COMMON words list
    const commonWords: string[] = [
      'wall',
      'floor',
      'roof',
      'door',
      'window',
      'column',
      'beam',
      'slab',
      'foundation',
      'pipe',
      'duct',
      'stair',
      'ramp',
      'curtain',
    ]

    // -------- MATCHING LOGIC -------
    elements.forEach((element: typeof elements[number]) => {
      tasks.forEach((task: typeof tasks[number]) => {
        const elementText: string =
          `${element.category || ''} ${element.family || ''} ${element.typeName || ''}`.toLowerCase()

        const taskText: string =
          `${task.name || ''} ${task.description || ''}`.toLowerCase()

        let matchScore = 0
        const reasons: string[] = []

        // Search match filters
        const elementSearchMatch =
          elementKeywords.length === 0 ||
          elementKeywords.some((keyword: string) => elementText.includes(keyword))

        const taskSearchMatch =
          taskKeywords.length === 0 ||
          taskKeywords.some((keyword: string) => taskText.includes(keyword))

        if (!elementSearchMatch || !taskSearchMatch) return

        // Common AEC keyword match
        commonWords.forEach((word: string) => {
          if (elementText.includes(word) && taskText.includes(word)) {
            matchScore += 1
            reasons.push(`Common keyword: "${word}"`)
          }
        })

        // Category / Type / Family matching
        if (element.category && taskText.includes(element.category.toLowerCase())) {
          matchScore += 2
          reasons.push(`Category "${element.category}" matches task`)
        }

        if (element.typeName && taskText.includes(element.typeName.toLowerCase())) {
          matchScore += 1
          reasons.push(`Type "${element.typeName}" matches task`)
        }

        if (element.family && taskText.includes(element.family.toLowerCase())) {
          matchScore += 1
          reasons.push(`Family "${element.family}" matches task`)
        }

        // Task keywords inside element text
        const taskNameWords: string[] = task.name
          .toLowerCase()
          .split(' ')
          .filter((w: string) => w.length > 2)

        taskNameWords.forEach((word: string) => {
          if (elementText.includes(word)) {
            matchScore += 0.5
            reasons.push(`Task keyword "${word}" found in element`)
          }
        })

        // Final suggestion
        if (matchScore > 0 && !existingLinkSet.has(`${element.id}-${task.id}`)) {
          suggestedLinks.push({
            elementId: element.id,
            taskId: task.id,
            reason: reasons.join(', ') || 'General similarity',
          })
        }
      })
    })

    return NextResponse.json({
      suggestions: suggestedLinks,
    })
  } catch (error) {
    console.error('AI link suggestion error:', error)
    return NextResponse.json(
      { error: 'Internal server error during AI link suggestion' },
      { status: 500 }
    )
  }
}
