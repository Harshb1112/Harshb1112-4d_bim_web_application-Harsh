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

// Log info level messages
export async function logInfo(message: string, options?: Omit<LogOptions, 'level'>) {
  return logError(message, { ...options, level: 'info' })
}

// Log warning level messages
export async function logWarning(message: string, options?: Omit<LogOptions, 'level'>) {
  return logError(message, { ...options, level: 'warn' })
}

// Log critical level messages
export async function logCritical(message: string, options?: Omit<LogOptions, 'level'>) {
  return logError(message, { ...options, level: 'critical' })
}

// Helper to log API errors with context
export async function logApiError(
  endpoint: string, 
  error: any, 
  options?: Omit<LogOptions, 'stackTrace' | 'context'>
) {
  const message = error?.message || String(error)
  const stackTrace = error?.stack || ''
  
  return logError(`API Error: ${endpoint} - ${message}`, {
    ...options,
    stackTrace,
    context: {
      endpoint,
      errorName: error?.name,
      timestamp: new Date().toISOString(),
    },
  })
}