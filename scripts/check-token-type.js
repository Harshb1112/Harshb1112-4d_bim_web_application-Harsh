/**
 * Quick script to decode and check token type
 * Usage: node scripts/check-token-type.js <token>
 */

const token = process.argv[2]

if (!token) {
  console.log('Usage: node scripts/check-token-type.js <token>')
  process.exit(1)
}

try {
  const parts = token.split('.')
  if (parts.length !== 3) {
    console.log('❌ Invalid JWT format')
    process.exit(1)
  }

  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

  console.log('\n📋 Token Analysis:')
  console.log('==================')
  console.log('Algorithm:', header.alg)
  console.log('Type:', header.typ)
  console.log('\nPayload:')
  console.log('  User ID:', payload.userId)
  console.log('  Email:', payload.email)
  console.log('  Role:', payload.role)
  console.log('  Issued:', new Date(payload.iat * 1000).toISOString())
  console.log('  Expires:', new Date(payload.exp * 1000).toISOString())
  
  const now = Date.now() / 1000
  if (payload.exp < now) {
    console.log('\n⚠️  Token is EXPIRED')
  } else {
    console.log('\n✅ Token is valid')
  }
  
  if (header.alg === 'HS256') {
    console.log('✅ Using HS256 (correct)')
  } else {
    console.log('❌ Using', header.alg, '(should be HS256)')
  }
  
} catch (error) {
  console.error('❌ Error decoding token:', error.message)
  process.exit(1)
}
