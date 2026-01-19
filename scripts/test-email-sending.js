const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailSending() {
  console.log('📧 Testing Email Configuration...\n');

  console.log('Configuration:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_USER:', process.env.SMTP_USER);
  console.log('  SMTP_FROM:', process.env.SMTP_FROM);
  console.log('  Password:', process.env.SMTP_PASSWORD ? '***configured***' : 'NOT SET');
  console.log('');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    console.log('🔄 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'harsh.bagadiya@krishnaos.com',
      subject: 'Test Email - Forgot Password Feature',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">🎉 Email Configuration Working!</h2>
          <p>This is a test email to verify that the forgot password feature is working correctly.</p>
          <p>If you received this email, it means:</p>
          <ul>
            <li>✅ SMTP configuration is correct</li>
            <li>✅ Email sending is working</li>
            <li>✅ Forgot password feature is ready to use</li>
          </ul>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n🎉 Email configuration is working perfectly!');
    console.log('   Check inbox: harsh.bagadiya@krishnaos.com');

  } catch (error) {
    console.error('❌ Email sending failed!');
    console.error('   Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n⚠️  Authentication failed. Please check:');
      console.error('   - SMTP_USER is correct');
      console.error('   - SMTP_PASSWORD is correct');
      console.error('   - Account allows SMTP access');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n⚠️  Connection failed. Please check:');
      console.error('   - SMTP_HOST is correct');
      console.error('   - SMTP_PORT is correct');
      console.error('   - Internet connection is working');
    }
  }
}

testEmailSending();
