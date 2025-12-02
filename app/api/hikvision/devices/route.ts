import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const HIK_CONFIG = {
  appKey: process.env.HIKVISION_APP_KEY || '',
  appSecret: process.env.HIKVISION_APP_SECRET || '',
  apiUrl: process.env.HIKVISION_API_URL || 'https://open.hik-connect.com'
}

// Get access token
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
 * GET - Get list of devices from Hik-Connect account
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

    if (!HIK_CONFIG.appKey || !HIK_CONFIG.appSecret) {
      return NextResponse.json({
        error: 'Hikvision API not configured',
        configured: false
      }, { status: 400 })
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get Hikvision access token' }, { status: 400 })
    }

    // Get device list
    const response = await fetch(`${HIK_CONFIG.apiUrl}/api/lapp/device/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        accessToken,
        pageStart: '0',
        pageSize: '50'
      })
    })

    const data = await response.json()

    if (data.code === '200') {
      const devices = (data.data || []).map((device: any) => ({
        deviceSerial: device.deviceSerial,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        status: device.status === 1 ? 'online' : 'offline',
        defence: device.defence,
        channelNo: device.channelNo || 1,
        isEncrypt: device.isEncrypt
      }))

      return NextResponse.json({
        success: true,
        devices,
        total: devices.length
      })
    } else {
      return NextResponse.json({
        error: 'Failed to get devices',
        hikError: data.msg
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Hikvision devices error:', error)
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}
