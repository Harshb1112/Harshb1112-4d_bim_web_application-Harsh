import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

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

    // Fetch historical health data (last 30 records)
    const historicalData = await prisma.scheduleHealth.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { date: 'asc' },
      take: 30
    });

    return NextResponse.json(historicalData);
  } catch (error: any) {
    console.error('Schedule health history GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch schedule health history',
      message: error.message 
    }, { status: 500 });
  }
}
