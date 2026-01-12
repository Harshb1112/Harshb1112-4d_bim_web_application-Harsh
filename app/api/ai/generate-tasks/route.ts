// Real AI Task Generator API - Using OpenAI GPT-4o-mini
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import OpenAI from 'openai'

// Initialize OpenAI lazily
let openai: OpenAI | null = null
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Task Generator (Legacy) API called - Redirecting to smart generator')
    
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { projectId, options = {} } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Fetch all elements from project
    const elements = await prisma.element.findMany({
      where: {
        model: {
          projectId: Number(projectId)
        }
      },
      select: {
        id: true,
        guid: true,
        category: true,
        family: true,
        typeName: true,
        level: true,
        parameters: true,
        properties: {
          select: {
            name: true,
            value: true,
            type: true
          }
        }
      }
    })

    if (elements.length === 0) {
      return NextResponse.json({ 
        error: 'No BIM elements found in project. Please upload a model first.' 
      }, { status: 400 })
    }

    // Format elements for AI
    const formattedElements = elements.map(element => {
      const propertiesObj: any = {}
      if (element.properties && element.properties.length > 0) {
        element.properties.forEach(prop => {
          propertiesObj[prop.name] = prop.value
        })
      }
      
      if (element.parameters && typeof element.parameters === 'object') {
        Object.assign(propertiesObj, element.parameters)
      }

      return {
        id: element.id,
        guid: element.guid,
        type: element.category || element.family || 'Unknown',
        name: element.typeName || element.family || 'Unnamed',
        category: element.category,
        family: element.family,
        level: element.level,
        properties: propertiesObj
      }
    })

    // Call the smart task generator logic (same as /api/ai/smart-task-generator)
    // This ensures consistency across both endpoints
    console.log(`🤖 Using Real AI: Processing ${formattedElements.length} elements`)

    // Use OpenAI to generate tasks
    const aiPrompt = `You are a construction project manager. Analyze ${formattedElements.length} BIM elements and create 6-10 construction tasks.

Element Summary:
${Object.entries(formattedElements.reduce((acc: any, el) => {
  acc[el.type] = (acc[el.type] || 0) + 1
  return acc
}, {})).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

Create realistic construction tasks covering all phases from start to finish.

Return JSON:
{
  "tasks": [
    {
      "name": "Task name using actual element names",
      "description": "Detailed description",
      "estimatedDuration": 45,
      "priority": "high|medium|low",
      "phase": "Pre-Construction|Foundation|Structure|Envelope|MEP|Interior Finishes|Exterior Finishes|Closeout",
      "estimatedCost": 150000,
      "phaseOrder": 1
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert construction project manager. Provide realistic, actionable construction tasks."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    })

    const aiResponse = completion.choices[0].message.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    const aiAnalysis = JSON.parse(aiResponse)

    // Process tasks with realistic dates
    const processedTasks = aiAnalysis.tasks.map((task: any, index: number) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + (index * 7)) // Weekly intervals
      
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + task.estimatedDuration)

      return {
        name: task.name,
        description: task.description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationDays: task.estimatedDuration || 30,
        elementCount: formattedElements.length,
        elementIds: formattedElements.map(e => e.id),
        phase: task.phase || 'Construction',
        phaseOrder: task.phaseOrder || (index + 1),
        priority: task.priority || 'medium',
        resource: 'Construction Team',
        estimatedCost: task.estimatedCost || 100000,
        aiGenerated: true,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: `OpenAI GPT-4o-mini (User: ${user.email})`,
          aiModel: 'gpt-4o-mini'
        }
      }
    })

    console.log(`✅ Real AI Generated ${processedTasks.length} tasks`)

    return NextResponse.json({
      success: true,
      message: `AI generated ${processedTasks.length} tasks from ${formattedElements.length} BIM elements`,
      tasks: processedTasks,
      statistics: {
        totalElements: formattedElements.length,
        elementGroups: new Set(formattedElements.map(e => e.type)).size,
        tasksGenerated: processedTasks.length,
        phases: [...new Set(processedTasks.map(t => t.phase))],
        estimatedDuration: Math.max(...processedTasks.map(t => t.durationDays))
      }
    })

  } catch (error) {
    console.error('❌ Real AI Task Generation error:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to generate AI tasks: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}