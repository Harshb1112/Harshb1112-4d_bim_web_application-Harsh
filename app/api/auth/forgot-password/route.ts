import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log('🔍 Forgot password request for:', email);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    console.log('👤 User found:', user ? `Yes (${user.fullName})` : 'No');

    // Always return success to prevent email enumeration
    if (!user) {
      console.log('⚠️  User not found, but returning success message');
      return NextResponse.json({
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    console.log('🔑 Generated reset token');

    // Save token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: resetToken,
        emailVerifyExpiry: resetExpiry
      }
    });

    console.log('💾 Token saved to database');

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    console.log('📧 Sending reset email to:', user.email);
    
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - BIM 4D Scheduler',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Password Reset Request</h2>
          <p>Hi ${user.fullName},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #1e3a8a; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">BIM 4D Scheduler - Construction Project Management</p>
        </div>
      `
    });

    if (emailResult.success) {
      console.log('✅ Email sent successfully!');
    } else {
      console.error('❌ Email sending failed:', emailResult.error);
    }

    return NextResponse.json({
      message: 'If an account exists with this email, you will receive a password reset link.',
      success: true
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
