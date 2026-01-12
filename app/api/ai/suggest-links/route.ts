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
