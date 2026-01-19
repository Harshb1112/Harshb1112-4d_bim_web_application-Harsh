import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const incidents = await prisma.safetyIncident.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(incidents);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const data = await req.json();

    const incident = await prisma.safetyIncident.create({
      data: {
        projectId: data.projectId,
        date: new Date(data.date),
        type: data.type,
        severity: data.severity,
        location: data.location,
        description: data.description,
        injuredPerson: data.injuredPerson,
        witnessNames: data.witnessNames,
        rootCause: data.rootCause,
        correctiveAction: data.correctiveAction,
        status: data.status || 'open',
        reportedBy: user.id
      }
    });

    return NextResponse.json(incident);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
  }
}
