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

    const talks = await prisma.toolboxTalk.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(talks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch toolbox talks' }, { status: 500 });
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

    const talk = await prisma.toolboxTalk.create({
      data: {
        projectId: data.projectId,
        date: new Date(data.date),
        topic: data.topic,
        description: data.description,
        conductedBy: data.conductedBy,
        attendees: data.attendees,
        attendeeCount: data.attendeeCount || 0,
        duration: data.duration,
        notes: data.notes,
        createdBy: user.id
      }
    });

    return NextResponse.json(talk);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create toolbox talk' }, { status: 500 });
  }
}
