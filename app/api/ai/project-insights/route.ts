import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import { decrypt } from '@/lib/encryption';

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

    const { projectId, question, projectData } = await request.json();

    if (!projectId || !question) {
      return NextResponse.json({ error: 'Project ID and question required' }, { status: 400 });
    }

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
        aiEnabled: false
      }, { status: 403 });
    }

    if (!userConfig.openaiApiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        apiKeyMissing: true
      }, { status: 403 });
    }

    const userApiKey = decrypt(userConfig.openaiApiKey);

    // Check credits
    try {
      console.log('🔍 Checking OpenAI credits...');
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

    console.log('🤖 Calling OpenAI for project insights...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert construction project manager with 20+ years of experience. Provide detailed, actionable insights based on project data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    console.log('✅ AI response generated');

    return NextResponse.json({
      success: true,
      response,
      tokensUsed: completion.usage?.total_tokens || 0
    });

  } catch (error: any) {
    console.error('❌ AI Insights error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
