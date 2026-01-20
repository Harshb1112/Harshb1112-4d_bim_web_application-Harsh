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
        aiApiKey: true
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
      hasApiKey: !!userConfig.aiApiKey
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

    // Auto-detect provider from API key if provided (PRIORITY: Key detection over manual selection)
    if (apiKey) {
      if (apiKey.startsWith('sk-ant-')) {
        aiProvider = 'claude';
        console.log('🔍 Auto-detected Claude API key (sk-ant-)');
      } else if (apiKey.startsWith('sk-')) {
        aiProvider = 'openai';
        console.log('🔍 Auto-detected OpenAI API key (sk-)');
      } else {
        return NextResponse.json(
          { error: 'Invalid API key format. OpenAI keys start with "sk-", Claude keys start with "sk-ant-"' },
          { status: 400 }
        );
      }
    }

    // If no new key provided but provider is being changed, validate existing key
    if (!apiKey && aiProvider) {
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { aiApiKey: true }
      });
      
      if (existingUser?.aiApiKey) {
        const decryptedKey = decrypt(existingUser.aiApiKey);
        // Validate that provider matches existing key
        if (decryptedKey.startsWith('sk-ant-') && aiProvider !== 'claude') {
          console.log('⚠️ Correcting provider: Existing key is Claude but provider was set to OpenAI');
          aiProvider = 'claude';
        } else if (decryptedKey.startsWith('sk-') && !decryptedKey.startsWith('sk-ant-') && aiProvider !== 'openai') {
          console.log('⚠️ Correcting provider: Existing key is OpenAI but provider was set to Claude');
          aiProvider = 'openai';
        }
      }
    }

    console.log('💾 Saving AI config:', { aiEnabled, aiProvider, hasApiKey: !!apiKey });

    // Update user's AI configuration in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        aiEnabled: aiEnabled || false,
        aiProvider: aiProvider || 'openai',
        aiApiKey: apiKey ? encrypt(apiKey) : null // Encrypt before saving
      }
    });

    console.log(`✅ AI configuration saved for user ${user.id}:`, {
      aiEnabled: updatedUser.aiEnabled,
      aiProvider: updatedUser.aiProvider,
      hasApiKey: !!updatedUser.aiApiKey
    });

    return NextResponse.json({
      success: true,
      message: 'AI configuration saved successfully',
      aiEnabled: updatedUser.aiEnabled,
      hasApiKey: !!updatedUser.aiApiKey
    });
  } catch (error) {
    console.error('Failed to save AI config:', error);
    return NextResponse.json(
      { error: 'Failed to save AI configuration' },
      { status: 500 }
    );
  }
}
