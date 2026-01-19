const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const prisma = new PrismaClient();

async function manualSendResetEmail() {
  try {
    console.log('📧 Manual Password Reset Email Sender\n');

    const testEmail = 'harsh.bagadiya@krishnaos.com';

    // Step 1: Find user
    console.log('Step 1: Finding user...');
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (!user) {
      console.log('❌ User not found!');
      console.log('   Available users:');
      const users = await prisma.user.findMany({
        select: { email: true, fullName: true }
      });
      users.forEach(u => console.log('   -', u.email, '-', u.fullName));
      return;
    }

    console.log('✅ User found:', user.fullName);
    console.log('');

    // Step 2: Generate token
    console.log('Step 2: Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    console.log('✅ Token generated');
    console.log('');

    // Step 3: Save token
    console.log('Step 3: Saving token to database...');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: resetToken,
        emailVerifyExpiry: resetExpiry
      }
    });

    console.log('✅ Token saved');
    console.log('');

    // Step 4: Send email
    console.log('Step 4: Sending email...');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: 'Password Reset Request - BIM 4D Scheduler',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background-color: #1e3a8a; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">🔑</span>
              </div>
            </div>
            
            <h2 style="color: #1e3a8a; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi <strong>${user.fullName}</strong>,</p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              You requested to reset your password for your BIM 4D Scheduler account. 
              Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #1e3a8a; color: white; padding: 14px 40px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Or copy and paste this link in your browser:
              </p>
              <p style="color: #1e3a8a; font-size: 13px; word-break: break-all; margin: 10px 0 0 0;">
                ${resetUrl}
              </p>
            </div>
            
            <div style="border-top: 2px solid #e5e7eb; margin: 30px 0; padding-top: 20px;">
              <p style="color: #ef4444; font-size: 14px; margin: 0 0 10px 0;">
                ⚠️ <strong>Important:</strong>
              </p>
              <ul style="color: #666; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you click the link above</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                BIM 4D Scheduler - Construction Project Management
              </p>
              <p style="color: #999; font-size: 11px; margin: 5px 0 0 0;">
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('');

    console.log('🎉 Success! Password reset email sent to:', user.email);
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Check email inbox: ' + user.email);
    console.log('   2. Click the reset link in the email');
    console.log('   3. Enter new password');
    console.log('');
    console.log('🔗 Direct reset link (valid for 1 hour):');
    console.log('   ' + resetUrl);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

manualSendResetEmail();
