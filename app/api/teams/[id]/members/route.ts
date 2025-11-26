import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest, hashPassword, generateRandomPassword } from '@/lib/auth'

// POST - Add a member to a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const teamId = parseInt(id)
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    // RBAC: Only Admin and Manager can add members
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Admin and Manager can add team members.' 
      }, { status: 403 })
    }

    const { fullName, email, memberRole } = await request.json()
    
    // RBAC: Check if user can create this role
    const requestedRole = memberRole === 'leader' ? 'team_leader' : 
                         memberRole === 'member' ? 'viewer' :
                         memberRole // admin or manager

    // Manager cannot create Admin or Manager
    if (user.role === 'manager' && (requestedRole === 'admin' || requestedRole === 'manager')) {
      return NextResponse.json({ 
        error: 'Managers cannot create Admin or Manager accounts. Only Team Leaders and Members allowed.' 
      }, { status: 403 })
    }
    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 })
    }

    // Check if user exists
    let userToAdd = await prisma.user.findUnique({ where: { email } })
    let temporaryPassword = null

    if (!userToAdd) {
      // Create new user
      temporaryPassword = generateRandomPassword()
      const passwordHash = await hashPassword(temporaryPassword)

      userToAdd = await prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash: passwordHash,
          role: requestedRole, // Use requested role with RBAC validation
        },
      })
    }

    // Check if already a member
    const existingMember = await prisma.teamMembership.findFirst({
      where: { userId: userToAdd.id, teamId },
    })
    
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 409 })
    }

    // No automatic promotion - seniority will be set manually by Admin/Manager

    // New members always start with no seniority (Normal)
    // Admin/Manager can manually promote them later
    const newMemberSeniority = null

    // Add to team
    const membership = await prisma.teamMembership.create({
      data: {
        teamId,
        userId: userToAdd.id,
        role: memberRole || 'member',
        seniority: newMemberSeniority
      },
      include: {
        user: {
          select: { 
            id: true,
            fullName: true, 
            email: true, 
            role: true 
          },
        },
      },
    })

    return NextResponse.json({ 
      member: membership, 
      temporaryPassword,
      message: temporaryPassword 
        ? `User created and added to team. Temporary password: ${temporaryPassword}`
        : 'User added to team successfully'
    })
  } catch (error) {
    console.error('Add team member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a member from a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const teamId = parseInt(id)
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    // RBAC: Only Admin and Manager can remove members
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ 
        error: 'Insufficient permissions' 
      }, { status: 403 })
    }

    const { membershipId } = await request.json()
    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 })
    }

    await prisma.teamMembership.delete({ where: { id: membershipId } })

    return NextResponse.json({ success: true, message: 'Member removed from team' })
  } catch (error) {
    console.error('Remove team member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
