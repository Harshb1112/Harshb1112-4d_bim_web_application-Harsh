import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const hubId = request.nextUrl.searchParams.get('hubId');

    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    if (!hubId) {
      return NextResponse.json(
        { error: 'Hub ID required' },
        { status: 400 }
      );
    }

    const client = new AutodeskClient();
    client.setAccessToken(token);

    const projects = await client.getProjects(hubId);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
