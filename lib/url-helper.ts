import { NextRequest } from 'next/server'

/**
 * Get the base URL for the application
 * Works in both development and production environments
 * 
 * Priority:
 * 1. NEXTAUTH_URL environment variable (if set)
 * 2. Request headers (x-forwarded-proto + x-forwarded-host)
 * 3. Fallback to localhost:3000
 */
export function getBaseUrl(request?: NextRequest): string {
  // If NEXTAUTH_URL is explicitly set, use it
  if (process.env.NEXTAUTH_URL) {
    console.log('🔧 Using NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    return process.env.NEXTAUTH_URL
  }

  // Try to get from request headers (works in production)
  if (request) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    
    console.log('🔍 Headers - protocol:', protocol, 'host:', host)
    
    if (host) {
      const url = `${protocol}://${host}`
      console.log('✅ Using dynamic URL:', url)
      return url
    }
  }

  // Fallback for development
  console.log('⚠️  Falling back to localhost')
  return 'http://localhost:3000'
}
