// Real AI Task Generator API - Using OpenAI or Claude
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { getUserAIConfig, callAI, handleAIError } from '@/lib/ai-helper'

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Task Generator (Legacy) API called')
    
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { 
      projectId, 
      options = {},
      aiProvider, // User-selected provider (optional)
      advancedMode = false,
      includeResourceAllocation = false,
      includeCostEstimation = false,
      includeRiskAnalysis = false,
      includeDependencies = false,
      projectType = 'general', // residential, commercial, infrastructure, industrial
      complexity = 'medium' // low, medium, high
    } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get user's AI configuration
    let aiConfig = await getUserAIConfig(user.id);
    if (!aiConfig) {
      return NextResponse.json({ 
        error: 'AI features not configured',
        message: 'Enable AI and add API key in Settings',
        aiEnabled: false
      }, { status: 403 });
    }

    // Override provider if user selected one
    if (aiProvider && (aiProvider === 'openai' || aiProvider === 'claude')) {
      aiConfig.aiProvider = aiProvider;
      console.log(`🔄 User selected provider: ${aiProvider}`);
    }

    console.log(`✅ Using ${aiConfig.aiProvider === 'claude' ? 'Claude' : 'OpenAI'} for task generation`);

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
        parameters: true
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

    // Build advanced AI prompt based on options
    let aiPrompt = `You are an expert construction project manager with 20+ years of experience. Analyze ${formattedElements.length} BIM elements and create ${advancedMode ? '15-25' : '6-10'} detailed construction tasks.

PROJECT CONTEXT:
- Project Type: ${projectType}
- Complexity Level: ${complexity}
- Total Elements: ${formattedElements.length}

ELEMENT BREAKDOWN:
${Object.entries(formattedElements.reduce((acc: any, el) => {
  acc[el.type] = (acc[el.type] || 0) + 1
  return acc
}, {})).map(([type, count]) => `- ${type}: ${count} units`).join('\n')}

DETAILED ELEMENT ANALYSIS:
${formattedElements.slice(0, 20).map(el => 
  `• ${el.type} - ${el.name} (Level: ${el.level || 'N/A'})`
).join('\n')}

REQUIREMENTS:
1. Create realistic, actionable construction tasks covering all phases
2. Use actual element names and quantities from the BIM model
3. Consider construction sequencing and logical dependencies
4. Include realistic durations based on industry standards
${includeResourceAllocation ? '5. Specify required resources (labor, equipment, materials)' : ''}
${includeCostEstimation ? '6. Provide detailed cost breakdowns with unit rates' : ''}
${includeRiskAnalysis ? '7. Identify potential risks and mitigation strategies' : ''}
${includeDependencies ? '8. Define task dependencies and critical path items' : ''}

Return ONLY valid JSON (no markdown, no explanations):
{
  "tasks": [
    {
      "name": "Task name with specific element references",
      "description": "Detailed description with quantities and specifications",
      "estimatedDuration": 45,
      "priority": "high|medium|low",
      "phase": "Pre-Construction|Foundation|Structure|Envelope|MEP|Interior Finishes|Exterior Finishes|Closeout",
      "estimatedCost": 150000,
      "phaseOrder": 1${includeResourceAllocation ? ',\n      "resources": {"labor": "5 workers", "equipment": "Crane, Concrete mixer", "materials": "Concrete, Rebar"}' : ''}${includeCostEstimation ? ',\n      "costBreakdown": {"labor": 50000, "materials": 80000, "equipment": 20000}' : ''}${includeRiskAnalysis ? ',\n      "risks": ["Weather delays", "Material shortage"], "mitigation": ["Weather monitoring", "Early procurement"]' : ''}${includeDependencies ? ',\n      "dependencies": [], "criticalPath": false' : ''}
    }
  ]${includeRiskAnalysis ? ',\n  "projectRisks": [\n    {"risk": "Overall project risk", "severity": "high|medium|low", "mitigation": "Strategy"}\n  ]' : ''}${advancedMode ? ',\n  "insights": {\n    "totalEstimatedDuration": 180,\n    "criticalPathDuration": 150,\n    "recommendedStartDate": "2025-02-01",\n    "keyMilestones": ["Foundation Complete", "Structure Complete", "MEP Rough-in", "Final Inspection"]\n  }' : ''}
}`

    const systemPrompt = `You are an expert construction project manager with deep knowledge of:
- Construction sequencing and scheduling
- BIM coordination and clash detection
- Resource planning and cost estimation
- Risk management and quality control
- Building codes and safety regulations

Provide realistic, actionable construction tasks based on actual BIM data. Return ONLY valid JSON without any markdown formatting or explanations.`;

    const maxTokens = advancedMode ? 6000 : 3000;
    const aiResponse = await callAI(aiConfig, aiPrompt, systemPrompt, maxTokens);
    
    // Clean and parse AI response
    let aiAnalysis: any;
    try {
      let cleanedResponse = aiResponse.trim();
      
      // Remove common prefixes
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
      
      aiAnalysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse.substring(0, 500));
      throw new Error('Invalid AI response format');
    }

    // Process tasks with realistic dates and advanced features
    let cumulativeDays = 0;
    const processedTasks = aiAnalysis.tasks.map((task: any, index: number) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + cumulativeDays)
      
      const duration = task.estimatedDuration || 30;
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + duration)
      
      // Update cumulative days for next task (with some overlap for parallel tasks)
      cumulativeDays += Math.floor(duration * 0.7); // 30% overlap

      const processedTask: any = {
        name: task.name,
        description: task.description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationDays: duration,
        elementCount: formattedElements.length,
        elementIds: formattedElements.map((e: any) => e.id),
        phase: task.phase || 'Construction',
        phaseOrder: task.phaseOrder || (index + 1),
        priority: task.priority || 'medium',
        resource: task.resources?.labor || 'Construction Team',
        estimatedCost: task.estimatedCost || 100000,
        aiGenerated: true,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: `${aiConfig.aiProvider === 'claude' ? 'Claude' : 'OpenAI'} (User: ${user.email})`,
          aiModel: aiConfig.aiProvider === 'claude' ? 'claude-3-5-sonnet' : 'gpt-4o-mini',
          aiProvider: aiConfig.aiProvider,
          advancedMode,
          projectType,
          complexity
        }
      };

      // Add advanced features if requested
      if (includeResourceAllocation && task.resources) {
        processedTask.resources = task.resources;
      }
      
      if (includeCostEstimation && task.costBreakdown) {
        processedTask.costBreakdown = task.costBreakdown;
      }
      
      if (includeRiskAnalysis && task.risks) {
        processedTask.risks = task.risks;
        processedTask.mitigation = task.mitigation;
      }
      
      if (includeDependencies && task.dependencies) {
        processedTask.dependencies = task.dependencies;
        processedTask.criticalPath = task.criticalPath || false;
      }

      return processedTask;
    })

    console.log(`✅ Real AI Generated ${processedTasks.length} tasks (Advanced Mode: ${advancedMode})`)

    // Build response with advanced insights
    const response: any = {
      success: true,
      message: `AI generated ${processedTasks.length} tasks from ${formattedElements.length} BIM elements`,
      tasks: processedTasks,
      statistics: {
        totalElements: formattedElements.length,
        elementGroups: new Set(formattedElements.map((e: any) => e.type)).size,
        tasksGenerated: processedTasks.length,
        phases: [...new Set(processedTasks.map((t: any) => t.phase))],
        estimatedDuration: Math.max(...processedTasks.map((t: any) => t.durationDays)),
        totalEstimatedCost: processedTasks.reduce((sum: number, t: any) => sum + (t.estimatedCost || 0), 0)
      }
    };

    // Add advanced insights if available
    if (advancedMode && aiAnalysis.insights) {
      response.insights = aiAnalysis.insights;
    }

    if (includeRiskAnalysis && aiAnalysis.projectRisks) {
      response.projectRisks = aiAnalysis.projectRisks;
    }

    // Add feature flags to response
    response.features = {
      advancedMode,
      resourceAllocation: includeResourceAllocation,
      costEstimation: includeCostEstimation,
      riskAnalysis: includeRiskAnalysis,
      dependencies: includeDependencies
    };

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Real AI Task Generation error:', error)
    
    // Handle AI errors with proper error response
    const errorResponse = handleAIError(error);
    return NextResponse.json(errorResponse.json, { status: errorResponse.status });
  }
}