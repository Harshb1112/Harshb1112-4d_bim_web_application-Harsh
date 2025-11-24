import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendEmail, generateVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password, role = 'member', teamId, teamRole = 'member', inviteToken } = await request.json()

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

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: inviteData?.role || role,
        emailVerifyToken,
        emailVerifyExpiry,
        invitedBy: inviteData?.invitedBy,
        ...(teamId && {
          teamMemberships: {
            create: {
              teamId: parseInt(teamId),
              role: teamRole
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