import { NextRequest, NextResponse } from 'next/server';
import AutodeskClient from '@/lib/autodesk-client';

// POST - Upload file and start translation to get URN
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucketKey = formData.get('bucketKey') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Get 2-legged token for OSS/Model Derivative
    const client = new AutodeskClient();
    const tokenData = await client.get2LeggedToken();
    client.setAccessToken(tokenData.access_token);

    // Generate bucket key if not provided (must be lowercase, 3-128 chars, alphanumeric and -_.)
    const clientId = process.env.AUTODESK_CLIENT_ID || 'default';
    const bucket = bucketKey || `bim4d-${clientId.toLowerCase().substring(0, 10)}-${Date.now()}`;
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and translate
    const result = await client.uploadAndTranslate(
      bucket,
      file.name,
      buffer,
      file.type || 'application/octet-stream'
    );

    return NextResponse.json({
      success: true,
      urn: result.urn,
      objectId: result.objectId,
      fileName: file.name,
      message: 'Translation started. Use /api/autodesk/translate/status to check progress.'
    });

  } catch (error: any) {
    console.error('Error in translate:', error);
    
    // Better error message
    let errorMessage = 'Failed to upload and translate';
    if (error.response?.data) {
      errorMessage = error.response.data.reason || error.response.data.message || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.response?.data },
      { status: 500 }
    );
  }
}
