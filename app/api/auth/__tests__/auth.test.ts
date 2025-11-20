import { NextRequest } from 'next/server'
import { POST as registerHandler } from '../register/route'
import { POST as loginHandler } from '../login/route'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'

// ----------------------
// TYPES
// ----------------------

interface MockUser {
  id?: number
  fullName: string
  email: string
  password?: string
  passwordHash?: string
  role?: string
  createdAt?: Date
}

// ----------------------
// MOCKS
// ----------------------

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// ----------------------
// MOCK NextRequest
// ----------------------
const createMockRequest = (body: unknown): NextRequest => {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('API Authentication Routes', () => {

  // ----------------------
  // REGISTER TESTS
  // ----------------------
  describe('POST /api/auth/register', () => {

    beforeEach(() => {
      jest.clearAllMocks()
      ;(hashPassword as jest.Mock).mockResolvedValue('hashedpassword123')
    })

    it('should register a new user successfully', async () => {
      const mockUser: MockUser = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      const request = createMockRequest(mockUser)

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        fullName: mockUser.fullName,
        email: mockUser.email,
        role: 'viewer',
        createdAt: new Date(),
        passwordHash: 'hashedpassword123',
      })

      const response = await registerHandler(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.user).toBeDefined()
      expect(body.user.email).toBe(mockUser.email)
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            fullName: mockUser.fullName,
            email: mockUser.email,
            passwordHash: 'hashedpassword123',
            role: 'viewer',
          },
        })
      )
    })

    it('should return 409 if user already exists', async () => {
      const mockUser: MockUser = {
        fullName: 'Test User',
        email: 'exists@example.com',
        password: 'password123',
      }

      const request = createMockRequest(mockUser)

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: mockUser.email,
      })

      const response = await registerHandler(request)
      const body = await response.json()

      expect(response.status).toBe(409)
      expect(body.error).toBe('User already exists')
    })

    it('should return 400 for missing fields', async () => {
      const request = createMockRequest({ email: 'test@example.com' })

      const response = await registerHandler(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Missing required fields')
    })
  })

  // ----------------------
  // LOGIN TESTS
  // ----------------------
  describe('POST /api/auth/login', () => {
    
    beforeEach(() => {
      jest.clearAllMocks()
    })

    const mockUser: MockUser = {
      id: 1,
      fullName: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashedpassword123',
      role: 'admin',
      createdAt: new Date(),
    }

    it('should log in successfully', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'password123',
      })

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(verifyPassword as jest.Mock).mockResolvedValue(true)

      const response = await loginHandler(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.user.email).toBe(mockUser.email)
      expect(body.token).toBeDefined()
      expect(verifyPassword).toHaveBeenCalledWith(
        'password123',
        mockUser.passwordHash
      )
    })

    it('should return 401 for invalid password', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(verifyPassword as jest.Mock).mockResolvedValue(false)

      const response = await loginHandler(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Invalid credentials')
    })

    it('should return 401 for non-existent user', async () => {
      const request = createMockRequest({
        email: 'nouser@example.com',
        password: 'password123',
      })

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await loginHandler(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Invalid credentials')
    })
  })
})
