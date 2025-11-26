import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendEmail, generateVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password, role = 'viewer', teamId, teamRole = 'member', inviteToken, newTeamName } = await request.json()

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // If invite token provided, validate it
    let inviteData = null
    if (inviteToken) {
      const invite = await prisma.user.findUnique({
        where: { inviteToken }
      })

      if (!invite || !invite.inviteExpiry || invite.inviteExpiry < new Date()) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation' },
          { status: 400 }
        )
      }

      inviteData = invite
    }

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex')
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Hash password
    const passwordHash = await hashPassword(password)
    
    const userRole = inviteData?.role || role
    
    // If Team Leader, create a team with provided name or their name
    let createdTeamId = teamId ? parseInt(teamId) : null
    
    if (userRole === 'team_leader' && !createdTeamId) {
      const teamName = newTeamName?.trim() || `${fullName}'s Team`
      const teamCode = teamName.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000)
      
      const team = await prisma.team.create({
        data: {
          name: teamName,
          code: teamCode
        }
      })
      createdTeamId = team.id
      console.log(`✅ Auto-created team: ${teamName} (${teamCode}) for Team Leader: ${fullName}`)
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: userRole,
        emailVerifyToken,
        emailVerifyExpiry,
        invitedBy: inviteData?.invitedBy,
        ...(createdTeamId && {
          teamMemberships: {
            create: {
              teamId: createdTeamId,
              role: userRole === 'team_leader' ? 'leader' : teamRole
            }
          }
        })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const emailContent = generateVerificationEmail(fullName, emailVerifyToken, baseUrl)
    await sendEmail({
      to: email,
      ...emailContent
    })

    return NextResponse.json({ 
      user,
      message: 'Registration successful. Please check your email to verify your account.'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}