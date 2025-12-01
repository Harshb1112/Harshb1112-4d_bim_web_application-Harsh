import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

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

    // Parse state (can be empty for simple auth)
    let projectId = null;
    let source = 'acc';
    let returnUrl = '/dashboard';
    
    if (state) {
      try {
        const parsed = JSON.parse(state);
        projectId = parsed.projectId;
        source = parsed.source || 'acc';
        returnUrl = parsed.returnUrl || (projectId ? `/project/${projectId}` : '/dashboard');
      } catch {
        // State might be just a return URL
        returnUrl = state;
      }
    }

    // Exchange code for token
    const client = new AutodeskClient();
    const callbackUrl = process.env.AUTODESK_CALLBACK_URL || 'http://localhost:3000/api/autodesk/callback';
    const tokenData = await client.getAccessToken(code, callbackUrl);

    // Create redirect response with token stored in cookie
    const redirectUrl = new URL(returnUrl, request.url);
    redirectUrl.searchParams.set('autodesk_auth', 'success');
    
    const response = NextResponse.redirect(redirectUrl);
    
    // Store token in httpOnly cookie
    response.cookies.set('autodesk_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
      path: '/'
    });
    
    if (tokenData.refresh_token) {
      response.cookies.set('autodesk_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 14, // 14 days
        path: '/'
      });
    }

    return response;
  } catch (error) {
    console.error('Autodesk callback error:', error);
    // Redirect to dashboard with error
    const errorUrl = new URL('/dashboard', request.url);
    errorUrl.searchParams.set('autodesk_auth', 'error');
    errorUrl.searchParams.set('error', 'Authentication failed');
    return NextResponse.redirect(errorUrl);
  }
}
