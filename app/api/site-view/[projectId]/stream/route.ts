import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { HikConnectClient, HikvisionDirectClient, HIK_CONNECT_CONFIG } from '@/lib/hikvision-api'

/**
 * GET - Get live stream URL for a camera
 * 
 * Query params:
 * - cameraId: ID of the camera in our database
 * - type: 'live' | 'playback'
 * - startTime: (for playback) ISO date string
 * - endTime: (for playback) ISO date string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { projectId } = await params
    const projectIdInt = parseInt(projectId)

    const { searchParams } = new URL(request.url)
    const cameraId = searchParams.get('cameraId')
    const streamType = searchParams.get('type') || 'live'

    if (!cameraId) {
      return NextResponse.json({ error: 'Camera ID required' }, { status: 400 })
    }

    // Get camera from database
    const camera = await prisma.siteCamera.findFirst({
      where: {
        id: parseInt(cameraId),
        projectId: projectIdInt,
        isActive: true
      }
    })

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 })
    }

    let streamUrl: string | null = null
    let streamType2: 'rtsp' | 'hls' | 'rtmp' | 'webrtc' = 'rtsp'

    // Check if camera has Hik-Connect cloud settings
    const settings = camera.settings as any
    
    if (settings?.hikConnect?.deviceSerial && HIK_CONNECT_CONFIG.appKey) {
      // Use Hik-Connect Cloud API
      try {
        const hikCloud = new HikConnectClient(HIK_CONNECT_CONFIG)
        
        if (streamType === 'playback') {
          const startTime = searchParams.get('startTime')
          const endTime = searchParams.get('endTime')
          
          if (!startTime || !endTime) {
            return NextResponse.json({ error: 'Start and end time required for playback' }, { status: 400 })
          }

          const result = await hikCloud.getPlaybackUrl(
            settings.hikConnect.deviceSerial,
            settings.hikConnect.channelNo || 1,
            new Date(startTime),
            new Date(endTime)
          )
          streamUrl = result.url
        } else {
          const result = await hikCloud.getLiveStreamUrl(
            settings.hikConnect.deviceSerial,
            settings.hikConnect.channelNo || 1
          )
          streamUrl = result.url
        }
        
        streamType2 = 'hls' // Hik-Connect returns HLS/RTMP URLs
      } catch (error) {
        console.error('Hik-Connect API error:', error)
        // Fall back to direct RTSP
      }
    }

    // Fall back to direct RTSP URL
    if (!streamUrl && camera.streamUrl) {
      streamUrl = camera.streamUrl
      streamType2 = 'rtsp'
    }

    if (!streamUrl) {
      return NextResponse.json({ 
        error: 'No stream URL configured for this camera',
        help: 'Please configure the camera with either Hik-Connect or direct RTSP URL'
      }, { status: 400 })
    }

    // Log the access
    await prisma.siteViewLog.create({
      data: {
        projectId: projectIdInt,
        userId: user.id,
        viewType: streamType,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      streamUrl,
      streamType: streamType2,
      camera: {
        id: camera.id,
        name: camera.name,
        brand: camera.brand,
        model: camera.model,
        location: camera.location
      },
      // Instructions for different stream types
      instructions: getStreamInstructions(streamType2, streamUrl)
    })

  } catch (error: any) {
    console.error('Stream API error:', error)
    return NextResponse.json({ 
      error: 'Failed to get stream URL',
      details: error?.message 
    }, { status: 500 })
  }
}

function getStreamInstructions(type: string, url: string) {
  switch (type) {
    case 'hls':
      return {
        type: 'HLS',
        description: 'HTTP Live Streaming - plays directly in browser',
        usage: 'Use video.js or hls.js to play this URL'
      }
    case 'rtmp':
      return {
        type: 'RTMP',
        description: 'Real-Time Messaging Protocol',
        usage: 'Use a media server to convert to WebRTC for browser playback'
      }
    case 'rtsp':
      return {
        type: 'RTSP',
        description: 'Real-Time Streaming Protocol - requires conversion for browser',
        usage: 'Use go2rtc, mediamtx, or similar to convert RTSP to WebRTC',
        go2rtcExample: `Add to go2rtc.yaml:\nstreams:\n  camera1: ${url}`,
        webrtcUrl: 'After go2rtc setup: http://localhost:8554/api/ws?src=camera1'
      }
    default:
      return { type, url }
  }
}

/**
 * POST - Capture a snapshot from camera
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { projectId } = await params
    const projectIdInt = parseInt(projectId)
    const body = await request.json()
    const { cameraId } = body

    if (!cameraId) {
      return NextResponse.json({ error: 'Camera ID required' }, { status: 400 })
    }

    const camera = await prisma.siteCamera.findFirst({
      where: {
        id: parseInt(cameraId),
        projectId: projectIdInt,
        isActive: true
      }
    })

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 })
    }

    let snapshotUrl: string | null = null
    const settings = camera.settings as any

    // Try Hik-Connect first
    if (settings?.hikConnect?.deviceSerial && HIK_CONNECT_CONFIG.appKey) {
      try {
        const hikCloud = new HikConnectClient(HIK_CONNECT_CONFIG)
        snapshotUrl = await hikCloud.captureSnapshot(
          settings.hikConnect.deviceSerial,
          settings.hikConnect.channelNo || 1
        )
      } catch (error) {
        console.error('Hik-Connect snapshot error:', error)
      }
    }

    // Fall back to direct ISAPI
    if (!snapshotUrl && camera.snapshotUrl) {
      snapshotUrl = camera.snapshotUrl
    }

    if (!snapshotUrl) {
      return NextResponse.json({ error: 'Cannot capture snapshot - no URL configured' }, { status: 400 })
    }

    // Save capture to database
    const capture = await prisma.siteCapture.create({
      data: {
        projectId: projectIdInt,
        cameraId: camera.id,
        captureType: '360_photo',
        url: snapshotUrl,
        capturedAt: new Date(),
        isProcessed: true
      }
    })

    return NextResponse.json({
      success: true,
      snapshotUrl,
      capture: {
        id: capture.id,
        capturedAt: capture.capturedAt.toISOString()
      }
    })

  } catch (error: any) {
    console.error('Snapshot API error:', error)
    return NextResponse.json({ error: 'Failed to capture snapshot' }, { status: 500 })
  }
}
