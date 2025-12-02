import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      console.log('[Users API] No token found')
      return NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 })
    }

    const currentUser = verifyToken(token)
    if (!currentUser) {
      console.log('[Users API] Invalid token')
      return NextResponse.json({ error: 'Invalid token - Please login again' }, { status: 401 })
    }
    
    console.log('[Users API] Request from user:', currentUser.email)

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const teamId = searchParams.get('teamId')

    // Build query
    const where: any = {}
    
    if (role) {
      where.role = role
    }

    if (teamId) {
      where.teamMemberships = {
        some: {
          teamId: parseInt(teamId)
        }
      }
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('[Users API] Error:', error?.message || error)
    console.error('[Users API] Stack:', error?.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
