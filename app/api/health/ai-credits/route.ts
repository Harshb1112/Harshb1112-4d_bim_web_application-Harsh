import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

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

    console.log('🤖 Fetching REAL AI credits info...');

    // Get REAL user's AI configuration from database
    const userConfig = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        aiEnabled: true,
        aiProvider: true,
        aiApiKey: true,
        createdAt: true
      }
    });

    if (!userConfig || !userConfig.aiEnabled || !userConfig.aiApiKey) {
      console.log('⚠️ AI not configured for user');
      return NextResponse.json({
        provider: 'openai',
        hasKey: false,
        estimatedCredits: 'Not configured',
        lastUsed: null,
        keyConfiguredAt: null,
        status: 'not_configured'
      });
    }

    // Try to decrypt and validate key
    let keyValid = false;
    let keyPreview = '';
    let detectedProvider: 'openai' | 'claude' = 'openai';
    
    try {
      const apiKey = decrypt(userConfig.aiApiKey);
      keyValid = true;
      keyPreview = `${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`;
      
      // Auto-detect provider from API key format
      if (apiKey.startsWith('sk-ant-')) {
        detectedProvider = 'claude';
        console.log('✅ Detected Claude API key');
      } else if (apiKey.startsWith('sk-')) {
        detectedProvider = 'openai';
        console.log('✅ Detected OpenAI API key');
      }
      
      console.log(`✅ API Key valid: ${keyPreview}, Provider: ${detectedProvider}`);
    } catch (error) {
      console.error('❌ Failed to decrypt API key:', error);
    }

    // Use detected provider (overrides database value if needed)
    const provider = detectedProvider;

    // Get REAL usage statistics from database
    // Simplified query - just get recent projects
    const recentProjects = await prisma.project.findMany({
      where: {
        team: {
          members: {
            some: { userId: user.id }
          }
        }
      },
      select: {
        id: true,
        name: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`✅ Found ${recentProjects.length} recent projects`);

    return NextResponse.json({
      provider,
      hasKey: keyValid,
      keyPreview: keyValid ? keyPreview : 'Invalid',
      estimatedCredits: keyValid 
        ? 'Check platform for actual balance' 
        : 'Key invalid or expired',
      lastUsed: recentProjects.length > 0 
        ? recentProjects[0].createdAt.toISOString() 
        : null,
      keyConfiguredAt: userConfig.createdAt.toISOString(),
      status: keyValid ? 'active' : 'invalid',
      recentActivity: recentProjects.length,
      billingUrl: provider === 'claude'
        ? 'https://console.anthropic.com/settings/billing'
        : 'https://platform.openai.com/account/billing',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ AI credits health error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch AI credits info' },
      { status: 500 }
    );
  }
}
