import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// GET - Fetch webhook logs
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // For now, return empty array as we don't have webhook logs table yet
    // In production, you would query from a webhook_logs table
    const logs: any[] = []

    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error('Error fetching webhook logs:', error)
    return NextResponse.json({ error: 'Failed to fetch webhook logs' }, { status: 500 })
  }
}

// POST - Create webhook log (called by webhook endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, url, status, response } = body

    // For now, just return success
    // In production, you would insert into webhook_logs table
    
    return NextResponse.json({ 
      success: true,
      message: 'Webhook log created'
    })
  } catch (error) {
    console.error('Error creating webhook log:', error)
    return NextResponse.json({ error: 'Failed to create webhook log' }, { status: 500 })
  }
}
