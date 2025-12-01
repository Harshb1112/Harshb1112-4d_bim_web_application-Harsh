import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const hubId = request.nextUrl.searchParams.get('hubId');
    const projectId = request.nextUrl.searchParams.get('projectId');
    const folderId = request.nextUrl.searchParams.get('folderId');

    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const client = new AutodeskClient();
    client.setAccessToken(token);

    // If folderId provided, get folder contents
    if (projectId && folderId) {
      const contents = await client.getFolderContents(projectId, folderId);
      return NextResponse.json({ contents });
    }

    // If hubId and projectId provided, get top folders
    if (hubId && projectId) {
      const folders = await client.getTopFolders(hubId, projectId);
      return NextResponse.json({ folders });
    }

    return NextResponse.json(
      { error: 'Either (hubId + projectId) or (projectId + folderId) required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}
