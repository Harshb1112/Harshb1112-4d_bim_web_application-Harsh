import { prisma } from '@/lib/db'

interface LogOptions {
  level?: 'info' | 'warn' | 'error' | 'critical'
  userId?: number
  projectId?: number
  stackTrace?: string
  context?: Record<string, any>
}

export async function logError(message: string, options?: LogOptions) {
  try {
    await prisma.errorLog.create({
      data: {
        message,
        level: options?.level || 'error',
        userId: options?.userId,
        projectId: options?.projectId,
        stackTrace: options?.stackTrace,
        context: options?.context || {},
      },
    })
  } catch (dbError) {
    console.error('Failed to log error to database:', dbError)
    console.error('Original error:', message, options)
  }
}