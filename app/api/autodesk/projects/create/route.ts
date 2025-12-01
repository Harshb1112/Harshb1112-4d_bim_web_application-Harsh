import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient, { CreateProjectData } from '@/lib/autodesk-client';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accountId, ...projectData } = body as { accountId: string } & CreateProjectData;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    if (!projectData.name) {
      return NextResponse.json(
        { error: 'Project name required' },
        { status: 400 }
      );
    }

    const client = new AutodeskClient();
    client.setAccessToken(token);

    const project = await client.createProject(accountId, projectData);

    return NextResponse.json({ 
      success: true,
      project 
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    
    // Handle Autodesk API errors
    if (error.response?.data) {
      return NextResponse.json(
        { error: error.response.data.message || 'Failed to create project' },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
