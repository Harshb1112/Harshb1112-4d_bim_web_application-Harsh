import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { logError } from '@/lib/error-logger'

// ---------- Types ----------
interface ErrorLogBody {
  message: string
  level?: string
  stackTrace?: string
  context?: Record<string, unknown>
  projectId?: number | string
}

interface ErrorLogQuery {
  projectId: string
  level?: string | null
  limit?: string | null
  offset?: string | null
}

interface WhereClause {
  projectId: number
  level?: string
}

// ---------- POST ----------
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null

    const body = (await request.json()) as ErrorLogBody
    const { message, stackTrace, context, projectId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required for error log' },
        { status: 400 }
      )
    }

    await logError(message, {
      stackTrace,
      context,
      userId: user?.id,
      projectId: projectId ? Number(projectId) : undefined,
    })

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
    })
  } catch (error) {
    console.error('API: Failed to create error log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------- GET ----------
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const query: ErrorLogQuery = {
      projectId: searchParams.get('projectId') ?? '',
      level: searchParams.get('level'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    }

    if (!query.projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const limit = Number(query.limit ?? '50')
    const offset = Number(query.offset ?? '0')

    // Check user access based on team membership
    const project = await prisma.project.findFirst({
      where: {
        id: Number(query.projectId),
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: {
                    userId: user.id
                  }
                }
              }
            })
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    const whereClause: WhereClause = {
      projectId: Number(query.projectId),
    }

    if (query.level && query.level !== 'all') {
      whereClause.level = query.level
    }

    const errorLogs = await prisma.errorLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    const totalCount = await prisma.errorLog.count({
      where: whereClause,
    })

    return NextResponse.json({ errorLogs, totalCount })
  } catch (error) {
    console.error('API: Failed to fetch error logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
