import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ 
    success: true, 
    message: 'Simple test works',
    timestamp: new Date().toISOString()
  })
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'GET test works',
    timestamp: new Date().toISOString()
  })
}
