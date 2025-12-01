import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

// GET - Check translation status
export async function GET(request: NextRequest) {
  try {
    const urn = request.nextUrl.searchParams.get('urn');

    if (!urn) {
      return NextResponse.json({ error: 'URN is required' }, { status: 400 });
    }

    // Get 2-legged token
    const client = new AutodeskClient();
    const tokenData = await client.get2LeggedToken();
    client.setAccessToken(tokenData.access_token);

    const status = await client.getTranslationStatus(urn);

    return NextResponse.json({
      urn: status.urn,
      status: status.status,
      progress: status.progress,
      hasThumbnail: status.hasThumbnail,
      ready: status.status === 'success',
      derivatives: status.derivatives?.length || 0
    });

  } catch (error: any) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check translation status' },
      { status: 500 }
    );
  }
}
