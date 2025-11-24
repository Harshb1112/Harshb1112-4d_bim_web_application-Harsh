import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { sendEmail, generateInviteEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Verify admin/manager authentication
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = verifyToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Only Admin and Manager can invite users' },
        { status: 403 }
      )
    }

    const { email, fullName, role, teamId } = await request.json()

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role permissions
    if (currentUser.role === 'manager') {
      // Manager cannot invite admin or manager
      if (['admin', 'manager'].includes(role)) {
        return NextResponse.json(
          { error: 'Managers cannot invite Admin or Manager roles' },
          { status: 403 }
        )
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create placeholder user with invite
    const invitedUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: '', // Will be set when they accept invite
        role,
        inviteToken,
        inviteExpiry,
        invitedBy: currentUser.id,
        isEmailVerified: false,
        ...(teamId && {
          teamMemberships: {
            create: {
              teamId: parseInt(teamId),
              role: role === 'team_leader' ? 'leader' : 'member'
            }
          }
        })
      },
      include: {
        teamMemberships: {
          include: {
            team: true
          }
        }
      }
    })

    // Send invite email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const teamName = invitedUser.teamMemberships[0]?.team.name || null
    const emailContent = generateInviteEmail(
      currentUser.fullName,
      fullName,
      role,
      teamName,
      inviteToken,
      baseUrl
    )

    await sendEmail({
      to: email,
      ...emailContent
    })

    return NextResponse.json({
      message: 'Invitation sent successfully',
      user: {
        id: invitedUser.id,
        fullName: invitedUser.fullName,
        email: invitedUser.email,
        role: invitedUser.role
      }
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
