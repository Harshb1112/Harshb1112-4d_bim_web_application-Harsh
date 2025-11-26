import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// PATCH - Promote/Demote a team member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin and Manager can promote/demote
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ 
        error: 'Only Admin and Manager can promote/demote members' 
      }, { status: 403 })
    }

    const { id, memberId } = await params
    const teamId = parseInt(id)
    const membershipId = parseInt(memberId)

    if (isNaN(teamId) || isNaN(membershipId)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
    }

    const { seniority } = await request.json()

    // Validate seniority value
    if (seniority !== null && seniority !== 'junior' && seniority !== 'senior') {
      return NextResponse.json({ 
        error: 'Invalid seniority. Must be null, "junior", or "senior"' 
      }, { status: 400 })
    }

    // Update seniority
    const updatedMember = await prisma.teamMembership.update({
      where: { id: membershipId },
      data: { seniority },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      }
    })

    const seniorityLabel = seniority === 'senior' ? 'Senior' : seniority === 'junior' ? 'Junior' : 'Normal'
    
    return NextResponse.json({ 
      member: updatedMember,
      message: `Successfully set ${updatedMember.user.fullName} as ${seniorityLabel}`
    })
  } catch (error) {
    console.error('Promote member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
