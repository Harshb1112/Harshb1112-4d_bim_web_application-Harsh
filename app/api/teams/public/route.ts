import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET all teams (public - no auth required for registration)
export async function GET(request: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Get public teams error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
