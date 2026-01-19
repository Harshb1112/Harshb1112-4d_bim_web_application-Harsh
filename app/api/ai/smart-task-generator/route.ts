import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { getUserAIConfig, callAI, handleAIError } from '@/lib/ai-helper'

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Task Generator API called')
    
    const token = getTokenFromRequest(request)
    if (!token) {
      console.log('❌ No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      console.log('❌ Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.email)

    const body = await request.json()
    console.log('📝 Request body:', JSON.stringify(body, null, 2))
    
    const { projectId, selectedElements } = body
    
    if (!projectId) {
      console.log('❌ Missing projectId')
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }
    
    // If no elements provided, create sample elements for demonstration
    let elementsToAnalyze = selectedElements
    if (!selectedElements || selectedElements.length === 0) {
      console.log('⚠️ No elements provided, using sample elements for demo')
      elementsToAnalyze = [
        { id: 'wall-001', type: 'Wall', name: 'Exterior Wall', properties: { material: 'Concrete', height: 3000 } },
        { id: 'door-001', type: 'Door', name: 'Main Entrance', properties: { width: 900, height: 2100 } },
        { id: 'window-001', type: 'Window', name: 'Office Window', properties: { width: 1200, height: 1500 } },
        { id: 'beam-001', type: 'Beam', name: 'Structural Beam', properties: { material: 'Steel', length: 6000 } },
        { id: 'column-001', type: 'Column', name: 'Support Column', properties: { material: 'Concrete', height: 3000 } }
      ]
    }

    console.log(`✅ Valid request: projectId=${projectId}, elements=${elementsToAnalyze.length}`)

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: Number(projectId),
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: { userId: user.id }
                }
              }
            })
      },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!project) {
      console.log('❌ Project not found or access denied')
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    console.log('✅ Project found:', project.name)

    // Get user's AI configuration
    const aiConfig = await getUserAIConfig(user.id);
    if (!aiConfig) {
      return NextResponse.json({ 
        error: 'AI features not configured',
        message: 'Enable AI and add API key in Settings',
        aiEnabled: false
      }, { status: 403 });
    }

    console.log(`✅ Using ${aiConfig.aiProvider === 'claude' ? 'Claude' : 'OpenAI'} for task generation`);

    // NOW process ALL elements - credit check already passed
    const totalElements = elementsToAnalyze.length;
    console.log(`✅ Processing ALL ${totalElements} elements with AI (credits available)`);

    // Get existing tasks for context
    const existingTasks = await prisma.task.findMany({
      where: { projectId: Number(projectId) },
      select: {
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        status: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    console.log(`🤖 Real AI Analysis: Processing ${elementsToAnalyze.length} elements for project ${project.name}`)

    // Prepare data for AI analysis - works for all model sources
    const elementAnalysis = elementsToAnalyze.map((element: any) => ({
      type: element.type || element.category || 'Unknown',
      name: element.name || element.typeName || 'Unnamed',
      category: element.category,
      family: element.family,
      level: element.level,
      properties: element.properties || {},
      id: element.id,
      guid: element.guid,
      modelSource: element.modelSource, // 'local_ifc', 'speckle', 'autodesk_acc', etc.
      modelName: element.modelName
    }))

    // Group elements by type for better analysis
    const elementsByType = elementAnalysis.reduce((acc: any, element: any) => {
      const type = element.type
      if (!acc[type]) acc[type] = []
      acc[type].push(element)
      return acc
    }, {})
    
    // Group elements by source
    const elementsBySource = elementAnalysis.reduce((acc: any, element: any) => {
      const source = element.modelSource || 'unknown'
      if (!acc[source]) acc[source] = []
      acc[source].push(element)
      return acc
    }, {})

    // Create AI prompt for real analysis
    const aiPrompt = `
You are an expert construction project manager and BIM specialist. Analyze the following BIM elements and create intelligent, realistic construction tasks.

PROJECT CONTEXT:
- Project Name: ${project.name}
- Location: ${project.location || 'Not specified'}
- **Project Start Date: ${project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}**
- **Project End Date: ${project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}**
- **Total Project Duration: ${project.startDate && project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days (~' + Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) + ' months / ' + (Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) || 1) + ' years)' : 'Not set'}**

**CRITICAL: ALL TASKS MUST FIT WITHIN THE PROJECT TIMELINE ABOVE!**

BIM MODEL SOURCES:
${Object.entries(elementsBySource).map(([source, elements]: [string, any]) => 
  `- ${source}: ${elements.length} elements`
).join('\n')}

SELECTED BIM ELEMENTS TO ANALYZE (${elementsToAnalyze.length} total):
${Object.entries(elementsByType).map(([type, elements]: [string, any]) => 
  `- ${type}: ${elements.length} elements`
).join('\n')}

SAMPLE ELEMENT NAMES FROM MODEL:
${Object.entries(elementsByType).slice(0, 10).map(([type, elements]: [string, any]) => {
  const sampleElements = elements.slice(0, 3).map((el: any) => el.name || el.typeName || 'Unnamed').join(', ')
  return `- ${type}: ${sampleElements}`
}).join('\n')}

DETAILED ELEMENT DATA:
${JSON.stringify(elementsByType, null, 2)}

EXISTING TASKS CONTEXT:
${existingTasks.map(task => `- ${task.name} (${task.status})`).join('\n')}

AVAILABLE TEAM MEMBERS:
${project.team?.members.map(member => 
  `- ${member.user.fullName} (${member.user.role})`
).join('\n') || 'No team members assigned'}

**MANDATORY REQUIREMENTS - YOU MUST FOLLOW THESE:**

1. **PROJECT TIMELINE COMPLIANCE:**
   - Project Duration: ${project.startDate && project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'Calculate based on elements'}
   - Start Date: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Today'}
   - End Date: ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Calculate'}
   - **ALL TASK DURATIONS MUST ADD UP TO MATCH PROJECT DURATION**
   - **DO NOT CREATE 90-DAY SCHEDULES FOR MULTI-YEAR PROJECTS**

2. **ELEMENT-BASED DURATION CALCULATION:**
   - Total Elements: ${elementsToAnalyze.length}
   - For ${elementsToAnalyze.length} elements, realistic timeline is:
     * Foundation: ${Math.ceil(elementsToAnalyze.length * 0.15)} days minimum
     * Structure: ${Math.ceil(elementsToAnalyze.length * 0.25)} days minimum
     * Envelope: ${Math.ceil(elementsToAnalyze.length * 0.20)} days minimum
     * MEP: ${Math.ceil(elementsToAnalyze.length * 0.20)} days minimum
     * Finishes: ${Math.ceil(elementsToAnalyze.length * 0.15)} days minimum
     * Closeout: ${Math.ceil(elementsToAnalyze.length * 0.05)} days minimum

3. Analyze ALL ${elementsToAnalyze.length} BIM elements from multiple sources (IFC, Speckle, Autodesk ACC)

4. Create 6-10 intelligent task suggestions covering COMPLETE construction lifecycle

5. **TASK NAMES MUST REFERENCE ACTUAL ELEMENT NAMES** from the model (e.g., "Install Basic Wall: Exterior - 200mm Concrete" not generic "Build Walls")

6. Tasks must cover ALL phases from START to FINISH:
   - **PRE-CONSTRUCTION**: Site preparation, mobilization, permits
   - **FOUNDATION**: Excavation, footings, basement work
   - **STRUCTURE**: Columns, beams, slabs, structural frame
   - **ENVELOPE**: Walls, windows, doors, roof
   - **MEP SYSTEMS**: Electrical, plumbing, HVAC, fire protection
   - **INTERIOR FINISHES**: Flooring, painting, fixtures
   - **EXTERIOR FINISHES**: Facade, landscaping
   - **CLOSEOUT**: Testing, commissioning, handover, documentation

7. Each task should have realistic construction sequencing with proper dependencies

8. Provide proper task names using ACTUAL element names from the model

9. Assign appropriate team members based on their roles and expertise

10. Estimate costs in Indian Rupees (INR) based on current market rates

11. Set appropriate priority levels based on critical path analysis

12. Group related elements together and name tasks after those element groups

13. Ensure tasks cover the ENTIRE project from beginning to end with REALISTIC timelines

RESPONSE FORMAT (JSON):
{
  "tasks": [
    {
      "name": "Use ACTUAL element names from model (e.g., 'Construct Basic Wall: Exterior - 200mm Concrete' or 'Install M_Door-Single-Flush: 900x2100mm')",
      "description": "Detailed description including scope, materials, and methods. Reference specific element types and names from the model.",
      "estimatedDuration": 120,
      "priority": "high|medium|low",
      "phase": "Pre-Construction|Foundation|Structure|Envelope|MEP|Interior Finishes|Exterior Finishes|Closeout",
      "suggestedTeamMember": "Team member name or role",
      "suggestedTeamMemberId": "ID if available",
      "estimatedCost": 150000,
      "dependencies": ["List of prerequisite tasks"],
      "materials": ["Required materials"],
      "equipment": ["Required equipment"],
      "safetyConsiderations": ["Safety requirements"],
      "qualityChecks": ["Quality control points"],
      "aiReasoning": "Why this task is suggested and how duration was calculated based on ${elementsToAnalyze.length} elements and project timeline. Mention specific element names.",
      "phaseOrder": 1
    }
  ],
  "overallAnalysis": "Summary of the construction approach and sequencing logic based on ALL ${elementsToAnalyze.length} elements, covering complete lifecycle from start to finish with realistic timeline fitting within ${project.startDate && project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'project duration'}",
  "riskFactors": ["Potential risks and mitigation strategies"],
  "recommendations": ["Additional recommendations for project success"],
  "projectTimeline": "Overall realistic timeline breakdown by phase (must match project duration of ${project.startDate && project.endDate ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) + ' months' : 'TBD'})"
}

**CRITICAL VALIDATION RULES:**
- **TASK NAMES**: Use actual element names from the BIM model (e.g., "Basic Wall: Exterior - 200mm", "M_Window: 1200x1500mm")
- Create tasks for EVERY construction phase from beginning (site prep) to end (handover)
- Ensure proper sequencing: Pre-Construction → Foundation → Structure → Envelope → MEP → Finishes → Closeout
- Each phase should have at least 1-2 tasks
- Total 6-10 tasks covering complete project lifecycle
- Set phaseOrder (1-8) to indicate sequence
- **DURATION VALIDATION**: 
  * Sum of all task durations MUST approximately equal project duration
  * For ${elementsToAnalyze.length} elements: minimum ${Math.ceil(elementsToAnalyze.length * 0.8)} days total
  * Foundation: minimum ${Math.ceil(elementsToAnalyze.length * 0.15)} days
  * Structure: minimum ${Math.ceil(elementsToAnalyze.length * 0.25)} days
  * MEP: minimum ${Math.ceil(elementsToAnalyze.length * 0.20)} days
  * Finishes: minimum ${Math.ceil(elementsToAnalyze.length * 0.15)} days
- **ALL TASKS MUST FIT WITHIN PROJECT TIMELINE**: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Start'} to ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'End'}
- **DO NOT CREATE SHORT SCHEDULES**: ${elementsToAnalyze.length} elements cannot be completed in 90 days!

Provide realistic, actionable tasks with REAL construction timelines (matching project duration) and ACTUAL element names from the BIM model.
`

    // Call AI for real analysis
    const systemPrompt = "You are an expert construction project manager with 20+ years of experience in BIM-based project planning. Provide detailed, realistic, and actionable construction task recommendations. Return valid JSON only.";

    let aiResponse: string;
    try {
      aiResponse = await callAI(aiConfig, aiPrompt, systemPrompt, 4000);
    } catch (error: any) {
      // Handle AI errors with proper error response
      const errorResponse = handleAIError(error);
      return NextResponse.json(errorResponse.json, { status: errorResponse.status });
    }

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    let aiAnalysis: any
    try {
      // Clean the response - remove markdown, extra text, etc.
      let cleanedResponse = aiResponse.trim();
      
      // Remove common prefixes that Claude/GPT might add
      const prefixPatterns = [
        /^Here is.*?JSON.*?:/i,
        /^Here's.*?JSON.*?:/i,
        /^The.*?JSON.*?:/i,
        /^```json\s*/,
        /^```\s*/,
      ];
      
      for (const pattern of prefixPatterns) {
        cleanedResponse = cleanedResponse.replace(pattern, '');
      }
      
      // Remove trailing markdown
      cleanedResponse = cleanedResponse.replace(/\s*```\s*$/, '');
      
      // Try to find JSON object if there's still extra text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      console.log('🧹 Cleaned AI response, attempting parse...');
      aiAnalysis = JSON.parse(cleanedResponse);
      console.log('✅ Successfully parsed AI response');
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiResponse.substring(0, 500) + '...');
      console.error('Parse error:', parseError);
      throw new Error('Invalid AI response format. The AI returned malformed JSON.');
    }

    // Process AI suggestions and add REALISTIC dates based on project timeline
    const processedTasks = aiAnalysis.tasks.map((task: any, index: number) => {
      // Calculate realistic dates based on project timeline
      let startDate: Date
      let endDate: Date
      
      if (project.startDate && project.endDate) {
        // Use project dates for realistic timeline
        const projectStart = new Date(project.startDate)
        const projectEnd = new Date(project.endDate)
        const totalProjectDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
        
        // Distribute tasks across project timeline based on phase order
        const phaseOrder = task.phaseOrder || (index + 1)
        const totalPhases = aiAnalysis.tasks.length
        
        // Calculate start date as percentage of project timeline
        const phaseStartPercent = ((phaseOrder - 1) / totalPhases)
        const daysFromStart = Math.floor(totalProjectDays * phaseStartPercent)
        
        startDate = new Date(projectStart)
        startDate.setDate(startDate.getDate() + daysFromStart)
        
        // Use AI's estimated duration (should be realistic from GPT)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + task.estimatedDuration)
        
        // Ensure end date doesn't exceed project end
        if (endDate > projectEnd) {
          endDate = new Date(projectEnd)
        }
      } else {
        // Fallback: Use realistic construction timeline (6-12 months minimum)
        startDate = new Date()
        const phaseOrder = task.phaseOrder || (index + 1)
        
        // Stagger by realistic intervals (weeks, not days)
        const weeksOffset = (phaseOrder - 1) * 4 // 4 weeks between phases
        startDate.setDate(startDate.getDate() + (weeksOffset * 7))
        
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + task.estimatedDuration)
      }

      // Find suggested team member ID
      let suggestedMemberId = null
      if (project.team?.members) {
        const member = project.team.members.find(m => 
          m.user.fullName.toLowerCase().includes(task.suggestedTeamMember?.toLowerCase()) ||
          m.user.role.toLowerCase().includes(task.suggestedTeamMember?.toLowerCase())
        )
        if (member) {
          suggestedMemberId = member.user.id
        }
      }

      return {
        ...task,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        suggestedTeamMemberId: suggestedMemberId,
        elementIds: elementsToAnalyze.map((el: any) => el.id),
        elementGuids: elementsToAnalyze.map((el: any) => el.guid || el.id),
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
        generatedBy: `${aiConfig.aiProvider === 'claude' ? 'Claude' : 'OpenAI'} (User: ${user.email})`,
        aiProvider: aiConfig.aiProvider
      }
    })

    console.log(`✅ Real AI Analysis Complete: Generated ${processedTasks.length} intelligent tasks`)

    return NextResponse.json({
      success: true,
      message: `AI analyzed ${elementsToAnalyze.length} elements and generated ${processedTasks.length} intelligent task suggestions`,
      tasks: processedTasks,
      analysis: {
        overallAnalysis: aiAnalysis.overallAnalysis,
        riskFactors: aiAnalysis.riskFactors,
        recommendations: aiAnalysis.recommendations,
        elementsAnalyzed: elementsToAnalyze.length,
        elementTypes: Object.keys(elementsByType),
        aiProvider: aiConfig.aiProvider,
        aiModel: aiConfig.aiProvider === 'claude' ? 'claude-3-5-sonnet' : 'gpt-4o-mini',
        processingTime: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ Real AI Task Generation error:', error)
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      stack: error.stack
    })
    
    // Handle AI errors with proper error response
    const errorResponse = handleAIError(error);
    return NextResponse.json(errorResponse.json, { status: errorResponse.status });
  }
}