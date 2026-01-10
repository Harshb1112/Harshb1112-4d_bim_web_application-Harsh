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
        openaiApiKey: true
      }
    });

    if (!userConfig) {
      return NextResponse.json({
        aiEnabled: false,
        hasApiKey: false
      });
    }

    return NextResponse.json({
      aiEnabled: userConfig.aiEnabled,
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
    const { aiEnabled, apiKey } = body;

    // Validate API key format if provided
    if (aiEnabled && apiKey && !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format' },
        { status: 400 }
      );
    }

    // Update user's AI configuration in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        aiEnabled: aiEnabled || false,
        openaiApiKey: apiKey ? encrypt(apiKey) : null // Encrypt before saving
      }
    });

    console.log(`✅ AI configuration saved for user ${user.id}:`, {
      aiEnabled: updatedUser.aiEnabled,
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
