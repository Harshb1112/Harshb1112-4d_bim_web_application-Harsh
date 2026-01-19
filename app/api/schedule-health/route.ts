import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { calculateScheduleHealth } from '@/lib/schedule-health-calculator';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const user = token ? verifyToken(token) : null;
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Calculate real-time schedule health metrics
    const healthMetrics = await calculateScheduleHealth(parseInt(projectId));

    // Save to database for historical tracking
    await prisma.scheduleHealth.create({
      data: {
        projectId: parseInt(projectId),
        ...healthMetrics
      }
    }).catch(() => {
      // Ignore duplicate errors, just return calculated metrics
    });

    return NextResponse.json(healthMetrics);
  } catch (error: any) {
    console.error('Schedule health GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch schedule health',
      message: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const user = token ? verifyToken(token) : null;
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    const health = await prisma.scheduleHealth.create({
      data: {
        projectId: data.projectId,
        overallScore: data.overallScore || 0,
        scheduleScore: data.scheduleScore || 0,
        costScore: data.costScore || 0,
        resourceScore: data.resourceScore || 0,
        spi: data.spi || 0,
        cpi: data.cpi || 0,
        scheduleVariance: data.scheduleVariance || 0,
        costVariance: data.costVariance || 0,
        bac: data.bac || 0,
        pv: data.pv || 0,
        ev: data.ev || 0,
        ac: data.ac || 0,
        eac: data.eac || 0,
        etc: data.etc || 0,
        vac: data.vac || 0,
        tcpi: data.tcpi || 0
      }
    });

    return NextResponse.json(health);
  } catch (error: any) {
    console.error('Schedule health POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to create schedule health',
      message: error.message 
    }, { status: 500 });
  }
}
