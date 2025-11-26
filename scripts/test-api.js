// Test teams API
const fetch = require('node-fetch')

async function testAPI() {
  try {
    console.log('🧪 Testing Teams API...\n')
    
    // You need to get a valid token from browser cookies
    console.log('⚠️  To test API, you need to:')
    console.log('1. Login to http://localhost:3000')
    console.log('2. Open Browser DevTools (F12)')
    console.log('3. Go to Console tab')
    console.log('4. Run this command:')
    console.log('')
    console.log('fetch("/api/teams", {credentials: "include"}).then(r => r.json()).then(console.log)')
    console.log('')
    console.log('This will show you the teams API response with members.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testAPI()
