import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail, generateVerificationEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/url-helper'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex')
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user with new token
    await prisma.user.update({
      where: { email },
      data: {
        emailVerifyToken,
        emailVerifyExpiry
      }
    })

    // Send new verification email with production URL
    const baseUrl = getBaseUrl(request)
    const emailContent = generateVerificationEmail(user.fullName, emailVerifyToken, baseUrl)
    await sendEmail({
      to: email,
      ...emailContent
    })

    return NextResponse.json({
      message: 'Verification email sent successfully. Please check your inbox.'
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
