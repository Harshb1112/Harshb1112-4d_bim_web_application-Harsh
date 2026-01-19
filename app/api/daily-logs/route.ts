import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      console.error('[DAILY-LOGS] No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    const date = req.nextUrl.searchParams.get('date');

    console.log('[DAILY-LOGS] GET request:', { projectId, date });

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (date) {
      console.log('[DAILY-LOGS] Fetching single log for date:', date);
      const log = await prisma.dailyLog.findUnique({
        where: {
          projectId_date: {
            projectId: parseInt(projectId),
            date: new Date(date)
          }
        }
      });
      console.log('[DAILY-LOGS] Found log:', log ? 'Yes' : 'No');
      return NextResponse.json(log);
    }

    console.log('[DAILY-LOGS] Fetching all logs for project:', projectId);
    const logs = await prisma.dailyLog.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { date: 'desc' }
    });
    console.log('[DAILY-LOGS] Found logs count:', logs.length);

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('[DAILY-LOGS] GET Error:', error.message);
    console.error('[DAILY-LOGS] Stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to fetch daily logs',
      message: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      console.error('[DAILY-LOGS] POST: No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const data = await req.json();

    console.log('[DAILY-LOGS] POST data:', data);

    const log = await prisma.dailyLog.upsert({
      where: {
        projectId_date: {
          projectId: data.projectId,
          date: new Date(data.date)
        }
      },
      update: {
        weather: data.weather,
        temperatureLow: data.temperatureLow,
        temperatureHigh: data.temperatureHigh,
        crewCount: data.crewCount,
        totalHours: data.totalHours,
        activities: data.activities,
        deliveries: data.deliveries,
        equipment: data.equipment,
        visitors: data.visitors,
        issues: data.issues,
        delays: data.delays,
        notes: data.notes
      },
      create: {
        projectId: data.projectId,
        date: new Date(data.date),
        weather: data.weather,
        temperatureLow: data.temperatureLow,
        temperatureHigh: data.temperatureHigh,
        crewCount: data.crewCount,
        totalHours: data.totalHours,
        activities: data.activities,
        deliveries: data.deliveries,
        equipment: data.equipment,
        visitors: data.visitors,
        issues: data.issues,
        delays: data.delays,
        notes: data.notes,
        createdBy: user.id
      }
    });

    console.log('[DAILY-LOGS] Log saved:', log.id);
    return NextResponse.json(log);
  } catch (error: any) {
    console.error('[DAILY-LOGS] POST Error:', error.message);
    console.error('[DAILY-LOGS] Stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to save daily log',
      message: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
