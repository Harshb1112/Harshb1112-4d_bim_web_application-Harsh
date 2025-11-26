import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { generateMSProjectXML } from '@/lib/msproject-exporter'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Verify user has access to project
    const projectAccess = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    })
    if (!projectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch project and tasks
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            predecessors: {
              include: {
                predecessor: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate MS Project XML
    const xmlContent = generateMSProjectXML(project)

    // Return XML file
    return new NextResponse(xmlContent, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${project.name}_schedule.xml"`,
      },
    })
  } catch (error) {
    console.error('MS Project export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
