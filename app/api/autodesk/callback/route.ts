import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code not provided' },
        { status: 400 }
      );
    }

    // Parse state
    const { projectId, source } = state ? JSON.parse(state) : {};

    if (!projectId || !source) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Exchange code for token
    const client = new AutodeskClient();
    const callbackUrl = process.env.AUTODESK_CALLBACK_URL || 'http://localhost:3000/api/autodesk/callback';
    const tokenData = await client.getAccessToken(code, callbackUrl);

    // Store token in database (you might want to encrypt this)
    // For now, we'll store it in the session or return it to the client
    
    // Redirect back to the project page with success
    const redirectUrl = new URL(`/projects/${projectId}`, request.url);
    redirectUrl.searchParams.set('autodesk_auth', 'success');
    redirectUrl.searchParams.set('access_token', tokenData.access_token);
    redirectUrl.searchParams.set('source', source);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Autodesk callback error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
