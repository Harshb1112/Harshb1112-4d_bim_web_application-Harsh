import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user with team memberships
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
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
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check email verification
    if (!user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 403 }
      )
    }

    // Check if account is marked for deletion and restore it
    if (user.deletionRequestedAt && user.deletionScheduledFor) {
      const now = new Date()
      const scheduledDate = new Date(user.deletionScheduledFor)
      
      // If deletion is still scheduled (not yet deleted)
      if (scheduledDate > now) {
        // Restore the account
        await prisma.user.update({
          where: { id: user.id },
          data: {
            deletionRequestedAt: null,
            deletionScheduledFor: null,
            deletionReminderSent: false,
          },
        })

        // Send restoration confirmation email
        try {
          const { sendEmail } = await import('@/lib/email-service')
          await sendEmail({
            to: user.email,
            subject: 'Account Restored Successfully',
            html: `
              <h2>Welcome Back!</h2>
              <p>Dear ${user.fullName},</p>
              <p>Your account has been successfully restored.</p>
              <p>The deletion request has been cancelled, and your account is now active again.</p>
              <p>All your data and projects are intact.</p>
              <br/>
              <p>Best regards,<br/>4D BIM Team</p>
            `,
          })
        } catch (emailError) {
          console.error('Failed to send restoration email:', emailError)
        }
      }
    }

    // Get device info from headers
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'Unknown'
    
    // Parse user agent for device info
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent)
    const isTablet = /tablet|ipad/i.test(userAgent)
    const deviceType = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'
    
    // Extract browser name
    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    // Create login session
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        deviceName: `${deviceType} - ${browser}`,
        deviceType,
        browser,
        ipAddress,
        location: 'Unknown', // Can be enhanced with IP geolocation
        isActive: true,
        lastActive: new Date()
      }
    })

    // Generate token
    const token = generateToken({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    })

    return NextResponse.json({ 
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        teams: user.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
          code: tm.team.code,
          role: tm.role
        }))
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}