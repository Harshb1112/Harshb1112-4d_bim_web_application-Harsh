import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Test successful', timestamp: Date.now() })
}

export async function POST() {
  return NextResponse.json({ message: 'POST test successful', timestamp: Date.now() })
}
