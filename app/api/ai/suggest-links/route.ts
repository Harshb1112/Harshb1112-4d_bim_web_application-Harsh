// Real AI Link Suggestion API - Using OpenAI GPT-4o-mini
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import OpenAI from 'openai'
import { decrypt } from '@/lib/encryption';

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

    const { projectId, elementSearchTerm = '', taskSearchTerm = '' } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    console.log('🤖 Real AI Link Suggestion: Analyzing project', projectId)

    // Check user's AI configuration
    const userConfig = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        aiEnabled: true,
        openaiApiKey: true
      }
    });

    if (!userConfig || !userConfig.aiEnabled) {
      return NextResponse.json({ 
        error: 'AI features are disabled',
        message: 'Enable AI in Settings → AI Configuration',
        aiEnabled: false
      }, { status: 403 });
    }

    if (!userConfig.openaiApiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        message: 'Add your OpenAI API key in Settings → AI Configuration',
        apiKeyMissing: true
      }, { status: 403 });
    }

    const userApiKey = decrypt(userConfig.openaiApiKey);

    // Check credits
    try {
      console.log('🔍 Checking credits...');
      const testOpenAI = new OpenAI({ apiKey: userApiKey });
      await testOpenAI.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      });
      console.log('✅ Credits available');
    } catch (error: any) {
      if (error?.status === 429) {
        return NextResponse.json({
          error: 'OpenAI API quota exceeded',
          message: 'No credits available',
          noCredits: true
        }, { status: 429 });
      } else if (error?.status === 401) {
        return NextResponse.json({
          error: 'Invalid OpenAI API key',
          invalidKey: true
        }, { status: 401 });
      }
    }

    const openai = new OpenAI({ apiKey: userApiKey });

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
      take: 100 // Limit for AI processing
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

    const existingLinkSet = new Set(
      existingLinks.map(link => `${link.elementId}-${link.taskId}`)
    )

    if (elements.length === 0 || tasks.length === 0) {
      return NextResponse.json({
        suggestions: [],
        totalMatches: 0,
        elementsCount: elements.length,
        tasksCount: tasks.length,
      })
    }

    // Use OpenAI to suggest intelligent links
    const aiPrompt = `You are a construction project manager. Analyze BIM elements and tasks to suggest intelligent links.

ELEMENTS (${elements.length}):
${elements.slice(0, 20).map(el => `- ${el.category || 'Unknown'}: ${el.family || 'Generic'} (ID: ${el.id})`).join('\n')}

TASKS (${tasks.length}):
${tasks.map(task => `- ${task.name} (ID: ${task.id})`).join('\n')}

Suggest which elements should be linked to which tasks based on construction logic.

Return JSON array (max 30 suggestions):
[
  {
    "elementId": number,
    "taskId": number,
    "reason": "Why this element belongs to this task"
  }
]`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert in construction sequencing and BIM coordination. Suggest logical element-task links."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })

    const aiResponse = completion.choices[0].message.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    let aiSuggestions
    try {
      const parsed = JSON.parse(aiResponse)
      aiSuggestions = parsed.suggestions || parsed.links || []
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      aiSuggestions = []
    }

    // Filter out existing links
    const suggestedLinks = aiSuggestions
      .filter((link: any) => !existingLinkSet.has(`${link.elementId}-${link.taskId}`))
      .slice(0, 50)

    console.log(`✅ Real AI suggested ${suggestedLinks.length} element-task links`)

    return NextResponse.json({
      suggestions: suggestedLinks,
      totalMatches: suggestedLinks.length,
      elementsCount: elements.length,
      tasksCount: tasks.length,
      aiGenerated: true,
      model: 'gpt-4o-mini'
    })

  } catch (error) {
    console.error('❌ Real AI link suggestion error:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error during AI link suggestion' },
      { status: 500 }
    )
  }
}
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

    // Extended construction keywords for better matching
    const constructionKeywords: Record<string, string[]> = {
      'foundation': ['foundation', 'footing', 'base', 'excavation', 'concrete', 'pour'],
      'structural': ['column', 'beam', 'slab', 'frame', 'steel', 'rebar', 'structural'],
      'wall': ['wall', 'partition', 'drywall', 'masonry', 'brick', 'block'],
      'floor': ['floor', 'flooring', 'slab', 'tile', 'carpet', 'finish'],
      'roof': ['roof', 'roofing', 'truss', 'shingle', 'membrane'],
      'door': ['door', 'frame', 'hardware', 'opening'],
      'window': ['window', 'glazing', 'glass', 'frame'],
      'mep': ['pipe', 'duct', 'hvac', 'plumbing', 'electrical', 'conduit', 'mechanical'],
      'finish': ['paint', 'finish', 'coating', 'ceiling', 'trim'],
      'exterior': ['facade', 'cladding', 'curtain', 'exterior', 'envelope'],
      'stair': ['stair', 'ramp', 'handrail', 'railing', 'landing'],
      'install': ['install', 'installation', 'mount', 'fix', 'place', 'set'],
    }

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
            matchScore += 2
            reasons.push(`Common keyword: "${word}"`)
          }
        })

        // Extended construction keyword matching
        Object.entries(constructionKeywords).forEach(([category, keywords]) => {
          const elementHasKeyword = keywords.some(k => elementText.includes(k))
          const taskHasKeyword = keywords.some(k => taskText.includes(k))
          if (elementHasKeyword && taskHasKeyword) {
            matchScore += 1.5
            reasons.push(`Construction category: "${category}"`)
          }
        })

        // Category / Type / Family matching
        if (element.category && taskText.includes(element.category.toLowerCase())) {
          matchScore += 3
          reasons.push(`Category "${element.category}" matches task`)
        }

        if (element.typeName && taskText.includes(element.typeName.toLowerCase())) {
          matchScore += 2
          reasons.push(`Type "${element.typeName}" matches task`)
        }

        if (element.family && taskText.includes(element.family.toLowerCase())) {
          matchScore += 2
          reasons.push(`Family "${element.family}" matches task`)
        }

        // Task keywords inside element text
        const taskNameWords: string[] = task.name
          .toLowerCase()
          .split(/[\s\-_]+/)
          .filter((w: string) => w.length > 2)

        taskNameWords.forEach((word: string) => {
          if (elementText.includes(word)) {
            matchScore += 1
            reasons.push(`Task keyword "${word}" found in element`)
          }
        })

        // Element keywords inside task text
        const elementWords: string[] = elementText
          .split(/[\s\-_]+/)
          .filter((w: string) => w.length > 2)

        elementWords.forEach((word: string) => {
          if (taskText.includes(word) && !reasons.some(r => r.includes(word))) {
            matchScore += 0.5
            reasons.push(`Element keyword "${word}" found in task`)
          }
        })

        // Final suggestion - lower threshold for more suggestions
        if (matchScore >= 0.5 && !existingLinkSet.has(`${element.id}-${task.id}`)) {
          suggestedLinks.push({
            elementId: element.id,
            taskId: task.id,
            reason: reasons.slice(0, 3).join(', ') || 'General similarity',
          })
        }
      })
    })

    // Sort by relevance (more reasons = better match)
    suggestedLinks.sort((a, b) => b.reason.split(',').length - a.reason.split(',').length)

    // If no keyword matches found, generate smart suggestions based on element categories and task order
    if (suggestedLinks.length === 0 && elements.length > 0 && tasks.length > 0) {
      // Group elements by category
      const elementsByCategory: Record<string, typeof elements> = {}
      elements.forEach(el => {
        const cat = el.category || 'Other'
        if (!elementsByCategory[cat]) elementsByCategory[cat] = []
        elementsByCategory[cat].push(el)
      })

      // Sort tasks by start date
      const sortedTasks = [...tasks].sort((a, b) => {
        if (!a.startDate) return 1
        if (!b.startDate) return -1
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      })

      // Distribute elements across tasks based on category groups
      const categories = Object.keys(elementsByCategory)
      const tasksPerCategory = Math.max(1, Math.floor(sortedTasks.length / categories.length))

      categories.forEach((category, catIndex) => {
        const categoryElements = elementsByCategory[category]
        const startTaskIndex = Math.min(catIndex * tasksPerCategory, sortedTasks.length - 1)
        const endTaskIndex = Math.min(startTaskIndex + tasksPerCategory, sortedTasks.length)
        
        // Assign elements in this category to tasks in this range
        categoryElements.slice(0, 10).forEach((element, elIndex) => {
          const taskIndex = startTaskIndex + (elIndex % (endTaskIndex - startTaskIndex || 1))
          const task = sortedTasks[taskIndex]
          
          if (task && !existingLinkSet.has(`${element.id}-${task.id}`)) {
            suggestedLinks.push({
              elementId: element.id,
              taskId: task.id,
              reason: `Smart suggestion: ${category} element → ${task.name} (based on schedule order)`,
            })
          }
        })
      })

      // Also suggest linking first few elements to first task as a starting point
      if (suggestedLinks.length === 0) {
        const firstTask = sortedTasks[0]
        elements.slice(0, 20).forEach(element => {
          if (!existingLinkSet.has(`${element.id}-${firstTask.id}`)) {
            suggestedLinks.push({
              elementId: element.id,
              taskId: firstTask.id,
              reason: `Suggested: Link ${element.category || 'element'} to "${firstTask.name}"`,
            })
          }
        })
      }
    }

    // Limit to top 50 suggestions
    const topSuggestions = suggestedLinks.slice(0, 50)

    return NextResponse.json({
      suggestions: topSuggestions,
      totalMatches: suggestedLinks.length,
      elementsCount: elements.length,
      tasksCount: tasks.length,
    })
  } catch (error) {
    console.error('AI link suggestion error:', error)
    return NextResponse.json(
      { error: 'Internal server error during AI link suggestion' },
      { status: 500 }
    )
  }
}
