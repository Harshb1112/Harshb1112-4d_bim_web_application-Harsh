import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const HIK_CONFIG = {
  appKey: process.env.HIKVISION_APP_KEY || '',
  appSecret: process.env.HIKVISION_APP_SECRET || '',
  apiUrl: process.env.HIKVISION_API_URL || 'https://open.hik-connect.com'
}

async function getAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${HIK_CONFIG.apiUrl}/api/lapp/token/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        appKey: HIK_CONFIG.appKey,
        appSecret: HIK_CONFIG.appSecret
      })
    })
    const data = await response.json()
    return data.code === '200' ? data.data.accessToken : null
  } catch {
    return null
  }
}

/**
 * GET - Get live stream URL for a device
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const deviceSerial = searchParams.get('deviceSerial')
    const channelNo = searchParams.get('channelNo') || '1'

    if (!deviceSerial) {
      return NextResponse.json({ error: 'Device serial required' }, { status: 400 })
    }

    if (!HIK_CONFIG.appKey || !HIK_CONFIG.appSecret) {
      return NextResponse.json({ error: 'Hikvision API not configured' }, { status: 400 })
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 400 })
    }

    // Get live stream URL
    const response = await fetch(`${HIK_CONFIG.apiUrl}/api/lapp/live/address/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        accessToken,
        deviceSerial,
        channelNo,
        protocol: '1', // 1=HLS, 2=RTMP
        quality: '1',  // 1=HD, 2=Smooth
        expireTime: '86400'
      })
    })

    const data = await response.json()

    if (data.code === '200') {
      return NextResponse.json({
        success: true,
        streamUrl: data.data.url,
        expireTime: data.data.expireTime,
        protocol: 'HLS'
      })
    } else {
      return NextResponse.json({
        error: 'Failed to get stream URL',
        hikError: data.msg,
        code: data.code
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Hikvision stream error:', error)
    return NextResponse.json({ error: 'Failed to get stream' }, { status: 500 })
  }
}

/**
 * POST - Capture snapshot from device
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { deviceSerial, channelNo = 1 } = body

    if (!deviceSerial) {
      return NextResponse.json({ error: 'Device serial required' }, { status: 400 })
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 400 })
    }

    // Capture snapshot
    const response = await fetch(`${HIK_CONFIG.apiUrl}/api/lapp/device/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        accessToken,
        deviceSerial,
        channelNo: channelNo.toString()
      })
    })

    const data = await response.json()

    if (data.code === '200') {
      return NextResponse.json({
        success: true,
        snapshotUrl: data.data.picUrl
      })
    } else {
      return NextResponse.json({
        error: 'Failed to capture snapshot',
        hikError: data.msg
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Hikvision snapshot error:', error)
    return NextResponse.json({ error: 'Failed to capture snapshot' }, { status: 500 })
  }
}
