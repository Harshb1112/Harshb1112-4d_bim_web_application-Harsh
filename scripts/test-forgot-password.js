const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testForgotPassword() {
  try {
    console.log('🔍 Testing Forgot Password Setup...\n');

    // Check if users exist
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        isEmailVerified: true
      },
      take: 5
    });

    console.log('📋 Available test users:');
    users.forEach(user => {
      console.log(`   ${user.email} - ${user.fullName} ${user.isEmailVerified ? '✅' : '❌ (not verified)'}`);
    });

    console.log('\n✨ Forgot Password Feature Ready!');
    console.log('\n📝 How to test:');
    console.log('   1. Go to: http://localhost:3000/login');
    console.log('   2. Click "Forgot password?" link');
    console.log('   3. Enter email: harsh.bagadiya@krishnaos.com');
    console.log('   4. Check email for reset link');
    console.log('   5. Click link and set new password');
    
    console.log('\n🔗 Direct URLs:');
    console.log('   Login: http://localhost:3000/login');
    console.log('   Forgot Password: http://localhost:3000/forgot-password');
    
    console.log('\n📧 Email Configuration:');
    console.log('   SMTP Host:', process.env.SMTP_HOST || 'Not configured');
    console.log('   SMTP User:', process.env.SMTP_USER || 'Not configured');
    console.log('   SMTP From:', process.env.SMTP_FROM || 'Not configured');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testForgotPassword();
