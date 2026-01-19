import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

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

    console.log('🏥 Running REAL system health checks...');

    // REAL DATABASE HEALTH CHECK
    let databaseStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let dbResponseTime = 0;
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1 as health_check`;
      dbResponseTime = Date.now() - startTime;
      
      if (dbResponseTime > 1000) {
        databaseStatus = 'warning'; // Slow response
      }
      console.log(`✅ Database: ${databaseStatus} (${dbResponseTime}ms)`);
    } catch (error) {
      databaseStatus = 'error';
      console.error('❌ Database: error', error);
    }

    // REAL API HEALTH CHECK (if this runs, API is healthy)
    const apiStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    console.log('✅ API: healthy');

    // REAL AI SERVICE HEALTH CHECK
    let aiServiceStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let aiProvider = 'not configured';
    try {
      const userConfig = await prisma.user.findUnique({
        where: { id: user.id },
        select: { 
          aiEnabled: true, 
          openaiApiKey: true,
          aiProvider: true 
        }
      });
      
      if (!userConfig?.aiEnabled) {
        aiServiceStatus = 'warning';
        aiProvider = 'disabled';
        console.log('⚠️ AI Service: disabled');
      } else if (!userConfig?.openaiApiKey) {
        aiServiceStatus = 'warning';
        aiProvider = 'no API key';
        console.log('⚠️ AI Service: no API key');
      } else {
        aiProvider = userConfig.aiProvider || 'openai';
        console.log(`✅ AI Service: ${aiProvider} configured`);
      }
    } catch (error) {
      aiServiceStatus = 'error';
      console.error('❌ AI Service: error', error);
    }

    // REAL STORAGE HEALTH CHECK
    let storageStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let storageInfo = { models: 0, uploads: 0 };
    try {
      // Check if we can query storage-related tables
      const modelCount = await prisma.model.count();
      const projectCount = await prisma.project.count();
      
      storageInfo = {
        models: modelCount,
        uploads: projectCount
      };
      
      console.log(`✅ Storage: healthy (${modelCount} models, ${projectCount} projects)`);
    } catch (error) {
      storageStatus = 'error';
      console.error('❌ Storage: error', error);
    }

    console.log('✅ REAL system health check complete');

    return NextResponse.json({
      database: databaseStatus,
      api: apiStatus,
      aiService: aiServiceStatus,
      storage: storageStatus,
      details: {
        dbResponseTime: `${dbResponseTime}ms`,
        aiProvider,
        storageInfo
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ System health error:', error);
    return NextResponse.json(
      { 
        database: 'error',
        api: 'error',
        aiService: 'error',
        storage: 'error',
        error: error.message
      },
      { status: 500 }
    );
  }
}
