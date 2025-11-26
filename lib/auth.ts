import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface User {
  id: number
  fullName: string
  email: string
  role: string
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id,
      fullName: user.fullName,
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '30d', algorithm: 'HS256' }
  )
}

export function verifyToken(token: string): User | null {
  try {
    // Decode without verification first to see what's in the token
    const decoded = jwt.decode(token) as any
    console.log('[Auth] Token decoded (unverified):', decoded ? `User: ${decoded.email}, Alg: ${decoded.alg}` : 'Invalid token format')
    
    // Now verify with HS256
    const verified = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any
    console.log('[Auth] Token verified successfully for user:', verified.email)
    return {
      id: verified.id,
      fullName: verified.fullName || '',
      email: verified.email,
      role: verified.role
    }
  } catch (error) {
    console.log('[Auth] Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
    console.log('[Auth] Token (first 20 chars):', token.substring(0, 20))
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token && token !== 'undefined' && token !== 'null') {
      console.log('[Auth] Token from Authorization header')
      return token
    }
  }

  // Fallback to cookie
  const cookieToken = request.cookies.get('token')?.value
  if (cookieToken && cookieToken !== 'undefined' && cookieToken !== 'null') {
    console.log('[Auth] Token from cookie')
    return cookieToken
  }

  console.log('[Auth] No token found. Headers:', Array.from(request.headers.keys()).join(', '))
  return null
}

export function generateRandomPassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}