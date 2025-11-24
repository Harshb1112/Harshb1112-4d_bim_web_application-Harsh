// Email service for sending verification and invite emails
import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Check if email is configured
  const emailHost = process.env.EMAIL_HOST
  const emailUser = process.env.EMAIL_USER
  const emailPassword = process.env.EMAIL_PASSWORD
  
  if (!emailHost || !emailUser || !emailPassword) {
    // If not configured, just log to console
    console.log('📧 Email would be sent (Email service not configured):')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Verification link:', html.match(/href="([^"]+)"/)?.[1])
    return { success: true }
  }
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    })
    
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser,
      to,
      subject,
      html
    })
    
    console.log('✅ Email sent successfully to:', to)
    return { success: true }
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    // Still return success so registration doesn't fail
    return { success: false, error }
  }
}

export function generateVerificationEmail(name: string, token: string, baseUrl: string) {
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`
  
  return {
    subject: 'Verify Your Email - 4D BIM Application',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #0070f3; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to 4D BIM Application!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for signing up. Please verify your email address to activate your account.</p>
            <a href="${verifyUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #0070f3;">${verifyUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
              <p>If you didn't create this account, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

export function generateInviteEmail(
  inviterName: string,
  inviteeName: string,
  role: string,
  teamName: string | null,
  token: string,
  baseUrl: string
) {
  const inviteUrl = `${baseUrl}/register?invite=${token}`
  
  return {
    subject: `You're invited to join 4D BIM Application as ${role}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #0070f3; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .info-box { 
              background: #f5f5f5; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>You've been invited!</h2>
            <p>Hi ${inviteeName},</p>
            <p>${inviterName} has invited you to join the 4D BIM Application.</p>
            <div class="info-box">
              <strong>Your Role:</strong> ${role}<br>
              ${teamName ? `<strong>Team:</strong> ${teamName}` : ''}
            </div>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #0070f3;">${inviteUrl}</p>
            <p>This invitation will expire in 7 days.</p>
            <div class="footer">
              <p>If you weren't expecting this invitation, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}
