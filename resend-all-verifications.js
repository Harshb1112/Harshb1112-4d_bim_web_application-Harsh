// Resend verification emails to all unverified users
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const crypto = require('crypto')

// Import email functions
const nodemailer = require('nodemailer')

const PRODUCTION_URL = 'https://4d-bim-web-application-harsh.vercel.app'

async function sendEmail({ to, subject, html }) {
  const emailHost = process.env.EMAIL_HOST
  const emailUser = process.env.EMAIL_USER
  const emailPassword = process.env.EMAIL_PASSWORD
  
  if (!emailHost || !emailUser || !emailPassword) {
    console.log('⚠️  Email not configured, skipping:', to)
    return { success: false }
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    })
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser,
      to,
      subject,
      html
    })
    
    return { success: true }
  } catch (error) {
    console.error('❌ Email failed:', error.message)
    return { success: false, error }
  }
}

function generateVerificationEmail(name, token, baseUrl) {
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

async function resendAllVerifications() {
  try {
    // Get all unverified users (but mark them as verified first to avoid login issues)
    const users = await prisma.user.findMany({
      where: {
        isEmailVerified: false
      }
    })
    
    console.log(`\n📧 Found ${users.length} unverified users\n`)
    
    let successCount = 0
    let failCount = 0
    
    for (const user of users) {
      // Generate new token
      const emailVerifyToken = crypto.randomBytes(32).toString('hex')
      const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      // Update user with new token AND verify them (so they can login)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifyToken,
          emailVerifyExpiry,
          isEmailVerified: true  // Verify them so they can login
        }
      })
      
      // Send email with production URL
      const emailContent = generateVerificationEmail(user.fullName, emailVerifyToken, PRODUCTION_URL)
      const result = await sendEmail({
        to: user.email,
        ...emailContent
      })
      
      if (result.success) {
        console.log(`✅ Sent to: ${user.email} (${user.fullName})`)
        successCount++
      } else {
        console.log(`❌ Failed: ${user.email} (${user.fullName})`)
        failCount++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    console.log(`\n💡 All users are now verified and can login!`)
    console.log(`   They will also receive new verification emails with production URLs.`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

resendAllVerifications()
