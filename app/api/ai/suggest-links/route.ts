// Real AI Link Suggestion API - Using OpenAI or Claude
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { getUserAIConfig, callAI, handleAIError } from '@/lib/ai-helper'

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

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    console.log('🤖 Real AI Link Suggestion: Analyzing project', projectId)

    // Get user's AI configuration
    const aiConfig = await getUserAIConfig(user.id);
    if (!aiConfig) {
      return NextResponse.json({ 
        error: 'AI features not configured',
        message: 'Enable AI and add API key in Settings',
        aiEnabled: false
      }, { status: 403 });
    }

    console.log(`✅ Using ${aiConfig.aiProvider === 'claude' ? 'Claude' : 'OpenAI'} for link suggestions`);

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
      take: 100
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

    // AI prompt
    const aiPrompt = `You are a construction project manager. Analyze BIM elements and tasks to suggest intelligent links.

ELEMENTS (${elements.length}):
${elements.slice(0, 20).map(el => `- ${el.category || 'Unknown'}: ${el.family || 'Generic'} (ID: ${el.id})`).join('\n')}

TASKS (${tasks.length}):
${tasks.map(task => `- ${task.name} (ID: ${task.id})`).join('\n')}

Suggest which elements should be linked to which tasks based on construction logic.

Return JSON array (max 30 suggestions):
{
  "suggestions": [
    {
      "elementId": number,
      "taskId": number,
      "reason": "Why this element belongs to this task"
    }
  ]
}`

    const systemPrompt = "You are an expert in construction sequencing and BIM coordination. Suggest logical element-task links. Return valid JSON only.";

    const aiResponse = await callAI(aiConfig, aiPrompt, systemPrompt, 2000);

    let aiSuggestions: any[] = []
    try {
      // Clean the response
      let cleanedResponse = aiResponse.trim();
      
      const prefixPatterns = [
        /^Here is.*?JSON.*?:/i,
        /^Here's.*?JSON.*?:/i,
        /^```json\s*/,
        /^```\s*/,
      ];
      
      for (const pattern of prefixPatterns) {
        cleanedResponse = cleanedResponse.replace(pattern, '');
      }
      
      cleanedResponse = cleanedResponse.replace(/\s*```\s*$/, '');
      
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanedResponse)
      aiSuggestions = parsed.suggestions || parsed.links || []
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      aiSuggestions = []
    }

    // Filter out existing links
    const suggestedLinks = aiSuggestions
      .filter((link: any) => !existingLinkSet.has(`${link.elementId}-${link.taskId}`))
      .slice(0, 50)

    console.log(`✅ AI suggested ${suggestedLinks.length} element-task links`)

    return NextResponse.json({
      suggestions: suggestedLinks,
      totalMatches: suggestedLinks.length,
      elementsCount: elements.length,
      tasksCount: tasks.length,
      aiGenerated: true,
      provider: aiConfig.aiProvider
    })

  } catch (error: any) {
    console.error('❌ AI link suggestion error:', error)
    
    // Handle AI errors with proper error response
    const errorResponse = handleAIError(error);
    return NextResponse.json(errorResponse.json, { status: errorResponse.status });
  }
}
