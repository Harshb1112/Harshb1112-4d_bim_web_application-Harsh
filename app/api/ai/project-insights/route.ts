import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserAIConfig, callAI, handleAIError } from '@/lib/ai-helper';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { projectId, question, projectData, healthMetrics } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get user's AI configuration
    const aiConfig = await getUserAIConfig(user.id);
    if (!aiConfig) {
      return NextResponse.json({ 
        error: 'AI features not configured',
        message: 'Enable AI and add API key in Settings',
        aiEnabled: false
      }, { status: 403 });
    }

    console.log(`✅ Using ${aiConfig.aiProvider === 'claude' ? 'Claude' : 'OpenAI'} for project insights`);

    // If healthMetrics provided, generate health analysis
    if (healthMetrics) {
      const healthPrompt = `You are an expert construction project manager analyzing project health metrics. Provide a comprehensive analysis with actionable recommendations.

**PROJECT HEALTH METRICS:**
- Overall Health Score: ${healthMetrics.overallScore}/100 (${healthMetrics.overallScore >= 80 ? 'Excellent' : healthMetrics.overallScore >= 60 ? 'Good' : healthMetrics.overallScore >= 40 ? 'Fair' : healthMetrics.overallScore >= 20 ? 'Poor' : 'Critical'})
- Schedule Score: ${healthMetrics.scheduleScore}/100
- Cost Score: ${healthMetrics.costScore}/100
- Resource Score: ${healthMetrics.resourceScore}/100

**EVM METRICS:**
- SPI (Schedule Performance Index): ${healthMetrics.spi.toFixed(2)} ${healthMetrics.spi >= 1 ? '✓ On Schedule' : '⚠ Behind Schedule'}
- CPI (Cost Performance Index): ${healthMetrics.cpi.toFixed(2)} ${healthMetrics.cpi >= 1 ? '✓ On Budget' : '⚠ Over Budget'}
- Schedule Variance: $${healthMetrics.scheduleVariance.toFixed(0)}
- Cost Variance: $${healthMetrics.costVariance.toFixed(0)}
- BAC (Budget at Completion): $${healthMetrics.bac}
- EAC (Estimate at Completion): $${healthMetrics.eac.toFixed(0)}
- VAC (Variance at Completion): $${healthMetrics.vac.toFixed(0)}

**ANALYSIS REQUIRED:**
1. Overall project health assessment
2. Key risks and concerns
3. Specific recommendations for improvement
4. Priority actions needed
5. Positive aspects to maintain

Provide a clear, actionable analysis in 3-4 paragraphs. Be specific and reference the metrics.`;

      const systemPrompt = "You are an expert construction project manager specializing in EVM analysis and project health monitoring. Provide clear, actionable insights.";

      console.log('🤖 Calling AI for health analysis...');
      const analysis = await callAI(aiConfig, healthPrompt, systemPrompt, 800);
      console.log('✅ AI health analysis generated');

      return NextResponse.json({
        success: true,
        analysis,
        aiProvider: aiConfig.aiProvider
      });
    }

    // Original Q&A functionality
    if (!question) {
      return NextResponse.json({ error: 'Question required for Q&A mode' }, { status: 400 });
    }

    // Prepare project context
    const tasks = projectData.tasks || [];
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter((t: any) => 
      t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed'
    ).length;
    const avgProgress = tasks.length > 0 
      ? Math.round(tasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / tasks.length) 
      : 0;

    const prompt = `You are an expert construction project manager and AI assistant. Answer the following question about the project with detailed insights and recommendations.

**PROJECT CONTEXT:**
- Project Name: ${projectData.name}
- Total Tasks: ${tasks.length}
- Completed Tasks: ${completedTasks} (${tasks.length > 0 ? Math.round((completedTasks/tasks.length)*100) : 0}%)
- In Progress: ${inProgressTasks}
- Overdue Tasks: ${overdueTasks}
- Average Progress: ${avgProgress}%
- Total Models: ${projectData.models?.length || 0}
- Total Resources: ${projectData.resources?.length || 0}

**TASK DETAILS:**
${tasks.slice(0, 20).map((t: any) => 
  `- ${t.name}: ${t.status} (${t.progress || 0}% complete)${t.endDate ? ` - Due: ${new Date(t.endDate).toLocaleDateString()}` : ''}`
).join('\n')}

**USER QUESTION:**
${question}

**INSTRUCTIONS:**
- Provide a detailed, actionable response
- Use data from the project context
- Include specific recommendations
- Highlight risks and opportunities
- Use markdown formatting for clarity
- Be concise but comprehensive

**RESPONSE:**`;

    const systemPrompt = "You are an expert construction project manager with 20+ years of experience. Provide detailed, actionable insights based on project data.";

    console.log('🤖 Calling AI for project insights...');
    const response = await callAI(aiConfig, prompt, systemPrompt, 1000);
    console.log('✅ AI response generated');

    return NextResponse.json({
      success: true,
      response,
      aiProvider: aiConfig.aiProvider
    });

  } catch (error: any) {
    console.error('❌ AI Insights error:', error);
    
    // Handle AI errors with proper error response
    const errorResponse = handleAIError(error);
    return NextResponse.json(errorResponse.json, { status: errorResponse.status });
  }
}
