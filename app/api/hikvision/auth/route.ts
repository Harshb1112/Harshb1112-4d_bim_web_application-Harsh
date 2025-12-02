import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import crypto from 'crypto'

/**
 * Hikvision Open Platform API Integration
 * 
 * To use this, you need to:
 * 1. Register at https://open.hikvision.com/
 * 2. Create an application
 * 3. Get App Key and App Secret
 * 4. Add to .env file
 */

const HIK_CONFIG = {
  appKey: process.env.HIKVISION_APP_KEY || '',
  appSecret: process.env.HIKVISION_APP_SECRET || '',
  // API endpoints - use appropriate region
  apiUrl: process.env.HIKVISION_API_URL || 'https://open.hik-connect.com'
}

// Generate signature for Hikvision API
function generateSignature(appKey: string, appSecret: string, timestamp: string): string {
  const signStr = `${appKey}${timestamp}${appSecret}`
  return crypto.createHash('md5').update(signStr).digest('hex')
}

/**
 * GET - Get Hikvision access token
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if Hikvision credentials are configured
    if (!HIK_CONFIG.appKey || !HIK_CONFIG.appSecret) {
      return NextResponse.json({
        error: 'Hikvision API not configured',
        message: 'Please add HIKVISION_APP_KEY and HIKVISION_APP_SECRET to .env file',
        setupGuide: {
          step1: 'Go to https://open.hikvision.com/',
          step2: 'Register/Login with your Hik-Connect account',
          step3: 'Create a new application',
          step4: 'Copy App Key and App Secret',
          step5: 'Add to .env file:\n  HIKVISION_APP_KEY=your_app_key\n  HIKVISION_APP_SECRET=your_app_secret'
        }
      }, { status: 400 })
    }

    // Get access token from Hikvision
    const timestamp = Date.now().toString()
    
    const response = await fetch(`${HIK_CONFIG.apiUrl}/api/lapp/token/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        appKey: HIK_CONFIG.appKey,
        appSecret: HIK_CONFIG.appSecret
      })
    })

    const data = await response.json()

    if (data.code === '200') {
      return NextResponse.json({
        success: true,
        accessToken: data.data.accessToken,
        expireTime: data.data.expireTime
      })
    } else {
      return NextResponse.json({
        error: 'Failed to get Hikvision token',
        hikError: data.msg,
        code: data.code
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Hikvision auth error:', error)
    return NextResponse.json({
      error: 'Hikvision API error',
      details: error?.message
    }, { status: 500 })
  }
}
