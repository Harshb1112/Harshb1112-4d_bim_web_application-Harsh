import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { projectId, serverUrl, streamId, token } = await request.json();

    if (!projectId || !serverUrl || !streamId || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate Speckle connection
    const speckleUrl = `${serverUrl}/streams/${streamId}`;
    
    try {
      const response = await fetch(speckleUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Invalid Speckle credentials or stream not found' },
          { status: 401 }
        );
      }

      const streamData = await response.json();

      // Create model record
      const model = await prisma.model.create({
        data: {
          projectId,
          name: streamData.name || `Speckle Stream ${streamId}`,
          source: 'speckle',
          sourceUrl: speckleUrl,
          sourceId: streamId,
          format: 'speckle',
          metadata: {
            serverUrl,
            streamId,
            streamName: streamData.name,
            description: streamData.description,
            connectedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        model,
        message: 'Connected to Speckle successfully',
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to connect to Speckle' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Speckle connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
