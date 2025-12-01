import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Autodesk Forge/APS credentials from environment
const CLIENT_ID = process.env.AUTODESK_CLIENT_ID
const CLIENT_SECRET = process.env.AUTODESK_CLIENT_SECRET

export async function GET(request: NextRequest) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Autodesk credentials not configured' },
        { status: 500 }
      )
    }

    // Check if we have a 3-legged token stored (for ACC access)
    const cookieStore = await cookies()
    const storedToken = cookieStore.get('autodesk_token')?.value
    
    if (storedToken) {
      // Return stored 3-legged token for ACC access
      return NextResponse.json({
        access_token: storedToken,
        expires_in: 3600,
        token_type: '3legged'
      })
    }

    // Fall back to 2-legged token (for OSS/public models only)
    console.log('[Autodesk Token] Requesting 2-legged token...')
    
    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'data:read data:write data:create bucket:read bucket:create viewables:read'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Autodesk Token] API Error:', response.status, errorText)
      
      // Try v1 endpoint as fallback
      console.log('[Autodesk Token] Trying v1 endpoint...')
      const v1Response = await fetch('https://developer.api.autodesk.com/authentication/v1/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'client_credentials',
          scope: 'data:read data:write data:create bucket:read bucket:create viewables:read'
        })
      })
      
      if (!v1Response.ok) {
        const v1ErrorText = await v1Response.text()
        console.error('[Autodesk Token] v1 API Error:', v1Response.status, v1ErrorText)
        return NextResponse.json(
          { error: 'Failed to get Autodesk token from both v1 and v2 APIs' },
          { status: 500 }
        )
      }
      
      const v1TokenData = await v1Response.json()
      console.log('[Autodesk Token] Got token from v1 API')
      return NextResponse.json({
        access_token: v1TokenData.access_token,
        expires_in: v1TokenData.expires_in,
        token_type: '2legged'
      })
    }

    const tokenData = await response.json()
    console.log('[Autodesk Token] Got token from v2 API')

    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: '2legged'
    })

  } catch (error) {
    console.error('[Autodesk Token] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Store 3-legged token
export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token, expires_in } = await request.json()
    
    if (!access_token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Store token in cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('autodesk_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expires_in || 3600
    })
    
    if (refresh_token) {
      response.cookies.set('autodesk_refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 14 // 14 days
      })
    }

    return response
  } catch (error) {
    console.error('[Autodesk Token] POST Error:', error)
    return NextResponse.json({ error: 'Failed to store token' }, { status: 500 })
  }
}
