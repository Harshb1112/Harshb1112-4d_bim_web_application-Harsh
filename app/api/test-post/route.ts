import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST POST] Request received')
    const body = await request.json()
    console.log('[TEST POST] Body:', body)
    
    return NextResponse.json({ 
      success: true, 
      received: body 
    })
  } catch (error: any) {
    console.error('[TEST POST] Error:', error)
    return new NextResponse(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
