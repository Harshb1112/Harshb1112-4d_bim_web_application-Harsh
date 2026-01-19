import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import prisma from '@/lib/db';

// GET AI configuration (user-specific)
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's AI config from database
    const userConfig = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        aiEnabled: true,
        aiProvider: true,
        openaiApiKey: true
      }
    });

    if (!userConfig) {
      return NextResponse.json({
        aiEnabled: false,
        aiProvider: 'openai',
        hasApiKey: false
      });
    }

    return NextResponse.json({
      aiEnabled: userConfig.aiEnabled,
      aiProvider: userConfig.aiProvider || 'openai',
      hasApiKey: !!userConfig.openaiApiKey
    });
  } catch (error) {
    console.error('Failed to fetch AI config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI configuration' },
      { status: 500 }
    );
  }
}

// POST/UPDATE AI configuration (user-specific)
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

    const body = await request.json();
    let { aiEnabled, aiProvider, apiKey } = body;

    // Auto-detect provider from API key if provided
    if (apiKey) {
      if (apiKey.startsWith('sk-ant-')) {
        aiProvider = 'claude';
        console.log('🔍 Auto-detected Claude API key');
      } else if (apiKey.startsWith('sk-')) {
        aiProvider = 'openai';
        console.log('🔍 Auto-detected OpenAI API key');
      } else {
        return NextResponse.json(
          { error: 'Invalid API key format. OpenAI keys start with "sk-", Claude keys start with "sk-ant-"' },
          { status: 400 }
        );
      }
    }

    console.log('💾 Saving AI config:', { aiEnabled, aiProvider, hasApiKey: !!apiKey });

    // Update user's AI configuration in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        aiEnabled: aiEnabled || false,
        aiProvider: aiProvider || 'openai',
        openaiApiKey: apiKey ? encrypt(apiKey) : null // Encrypt before saving
      }
    });

    console.log(`✅ AI configuration saved for user ${user.id}:`, {
      aiEnabled: updatedUser.aiEnabled,
      aiProvider: updatedUser.aiProvider,
      hasApiKey: !!updatedUser.openaiApiKey
    });

    return NextResponse.json({
      success: true,
      message: 'AI configuration saved successfully',
      aiEnabled: updatedUser.aiEnabled,
      hasApiKey: !!updatedUser.openaiApiKey
    });
  } catch (error) {
    console.error('Failed to save AI config:', error);
    return NextResponse.json(
      { error: 'Failed to save AI configuration' },
      { status: 500 }
    );
  }
}
