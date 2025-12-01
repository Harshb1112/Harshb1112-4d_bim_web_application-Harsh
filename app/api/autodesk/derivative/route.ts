import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const AUTODESK_BASE_URL = 'https://developer.api.autodesk.com';

// GET - Get derivative URN for a file (for viewing)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const itemId = request.nextUrl.searchParams.get('itemId');
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    if (!itemId || !projectId) {
      return NextResponse.json({ error: 'itemId and projectId required' }, { status: 400 });
    }

    // Get item tip (latest version)
    const tipResponse = await axios.get(
      `${AUTODESK_BASE_URL}/data/v1/projects/${projectId}/items/${itemId}/tip`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const versionData = tipResponse.data.data;
    
    // Get the derivative URN from the version
    // The derivative URN is in relationships.derivatives.data.id
    let derivativeUrn = null;
    
    if (versionData.relationships?.derivatives?.data?.id) {
      derivativeUrn = versionData.relationships.derivatives.data.id;
    } else if (versionData.id) {
      // Use version ID as URN (encode it)
      derivativeUrn = Buffer.from(versionData.id)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    return NextResponse.json({
      derivativeUrn,
      versionId: versionData.id,
      fileName: versionData.attributes?.displayName || versionData.attributes?.name,
      fileType: versionData.attributes?.fileType,
      createTime: versionData.attributes?.createTime,
    });

  } catch (error: any) {
    console.error('Error getting derivative:', error.response?.data || error);
    return NextResponse.json(
      { error: error.response?.data?.message || 'Failed to get derivative URN' },
      { status: 500 }
    );
  }
}

// POST - Translate a file to get viewable URN
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const body = await request.json();
    const { urn } = body;

    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    if (!urn) {
      return NextResponse.json({ error: 'URN required' }, { status: 400 });
    }

    // Encode URN if needed
    let encodedUrn = urn;
    if (urn.includes(':')) {
      encodedUrn = Buffer.from(urn)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    // Start translation job
    const translateResponse = await axios.post(
      `${AUTODESK_BASE_URL}/modelderivative/v2/designdata/job`,
      {
        input: { urn: encodedUrn },
        output: {
          formats: [{ type: 'svf2', views: ['2d', '3d'] }]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-ads-force': 'true'
        }
      }
    );

    return NextResponse.json({
      success: true,
      urn: encodedUrn,
      result: translateResponse.data.result,
      message: 'Translation started'
    });

  } catch (error: any) {
    console.error('Error starting translation:', error.response?.data || error);
    return NextResponse.json(
      { error: error.response?.data?.message || 'Failed to start translation' },
      { status: 500 }
    );
  }
}
