import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const source = searchParams.get('source') || 'acc';
    const stateParam = searchParams.get('state');

    const client = new AutodeskClient();
    const callbackUrl = process.env.AUTODESK_CALLBACK_URL || 'http://localhost:3000/api/autodesk/callback';
    
    // Build state for callback
    let state: any = { source };
    
    if (stateParam) {
      try {
        state = { ...state, ...JSON.parse(decodeURIComponent(stateParam)) };
      } catch {
        state.returnUrl = stateParam;
      }
    }
    
    if (projectId) {
      state.projectId = projectId;
      if (!state.returnUrl) {
        state.returnUrl = `/project/${projectId}`;
      }
    }

    const authUrl = client.getAuthorizationUrl(callbackUrl, JSON.stringify(state));

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Autodesk auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
