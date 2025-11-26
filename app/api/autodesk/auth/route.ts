import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const source = searchParams.get('source'); // 'acc' or 'drive'

    if (!projectId || !source) {
      return NextResponse.json(
        { error: 'Missing projectId or source' },
        { status: 400 }
      );
    }

    const client = new AutodeskClient();
    const callbackUrl = process.env.AUTODESK_CALLBACK_URL || 'http://localhost:3000/api/autodesk/callback';
    
    // Store state for callback
    const state = JSON.stringify({ projectId, source });
    const authUrl = client.getAuthorizationUrl(callbackUrl, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Autodesk auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
