import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const projectId = request.nextUrl.searchParams.get('projectId');
    const folderId = request.nextUrl.searchParams.get('folderId');

    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    if (!projectId || !folderId) {
      return NextResponse.json(
        { error: 'Project ID and Folder ID required' },
        { status: 400 }
      );
    }

    const client = new AutodeskClient();
    client.setAccessToken(token);

    const contents = await client.getFolderContents(projectId, folderId);

    return NextResponse.json({ contents });
  } catch (error) {
    console.error('Error fetching folder contents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folder contents' },
      { status: 500 }
    );
  }
}
