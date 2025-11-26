import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const clientId = process.env.AUTODESK_CLIENT_ID
    const clientSecret = process.env.AUTODESK_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Autodesk credentials not configured' },
        { status: 500 }
      )
    }

    // Get 2-legged OAuth token
    const tokenResponse = await fetch(
      'https://developer.api.autodesk.com/authentication/v1/authenticate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
          scope: 'viewables:read data:read',
        }),
      }
    )

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Autodesk token error:', error)
      return NextResponse.json(
        { error: 'Failed to get Autodesk token' },
        { status: 500 }
      )
    }

    const tokenData = await tokenResponse.json()

    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    })
  } catch (error) {
    console.error('Error getting Autodesk token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
