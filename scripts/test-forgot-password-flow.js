const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
require('dotenv').config();

const prisma = new PrismaClient();

async function testForgotPasswordFlow() {
  try {
    console.log('🧪 Testing Complete Forgot Password Flow\n');

    const testEmail = 'harsh.bagadiya@krishnaos.com';

    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists...');
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (!user) {
      console.log('❌ User not found in database!');
      console.log('   Please create user first or use existing email');
      return;
    }

    console.log('✅ User found:', user.fullName);
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);
    console.log('');

    // Step 2: Test forgot password API
    console.log('Step 2: Testing forgot password API...');
    console.log('   Making POST request to /api/auth/forgot-password');
    
    const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    const data = await response.json();
    console.log('   Response status:', response.status);
    console.log('   Response:', data);

    if (!response.ok) {
      console.log('❌ API request failed!');
      return;
    }

    console.log('✅ API request successful');
    console.log('');

    // Step 3: Check if token was saved
    console.log('Step 3: Checking if reset token was saved...');
    const updatedUser = await prisma.user.findUnique({
      where: { email: testEmail },
      select: {
        emailVerifyToken: true,
        emailVerifyExpiry: true
      }
    });

    if (!updatedUser.emailVerifyToken) {
      console.log('❌ Reset token not saved in database!');
      return;
    }

    console.log('✅ Reset token saved in database');
    console.log('   Token:', updatedUser.emailVerifyToken.substring(0, 20) + '...');
    console.log('   Expires:', updatedUser.emailVerifyExpiry);
    console.log('');

    // Step 4: Generate reset URL
    const resetUrl = `http://localhost:3000/reset-password?token=${updatedUser.emailVerifyToken}`;
    console.log('Step 4: Reset URL generated');
    console.log('   URL:', resetUrl);
    console.log('');

    // Summary
    console.log('✨ Test Summary:');
    console.log('   ✅ User exists in database');
    console.log('   ✅ API endpoint working');
    console.log('   ✅ Reset token generated and saved');
    console.log('   ✅ Email should be sent (check inbox)');
    console.log('');
    console.log('📧 Check email inbox: ' + testEmail);
    console.log('🔗 Or use this direct link to reset password:');
    console.log('   ' + resetUrl);
    console.log('');
    console.log('⏰ Token expires in 1 hour');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Server not running!');
      console.error('   Please start the dev server first:');
      console.error('   npm run dev');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testForgotPasswordFlow();
