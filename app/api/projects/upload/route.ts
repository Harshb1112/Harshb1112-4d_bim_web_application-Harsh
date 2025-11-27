import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Force nodejs runtime for file uploads
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      // Clear invalid token cookie
      const response = NextResponse.json({ error: 'Invalid token - please login again' }, { status: 401 })
      response.cookies.set('token', '', { maxAge: 0, path: '/' })
      return response
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Only admin and manager can create projects' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectDataStr = formData.get('projectData') as string

    if (!projectDataStr) {
      return NextResponse.json({ error: 'Project data is required' }, { status: 400 })
    }

    const projectData = JSON.parse(projectDataStr)
    const { 
      name, 
      description, 
      startDate, 
      endDate, 
      teamId, 
      teamLeaderId, 
      bimSource,
      speckleUrl,
      autodeskUrn,
      autodeskFileUrl
    } = projectData

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    if (!teamId) {
      return NextResponse.json({ error: 'Team assignment is required' }, { status: 400 })
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Verify team leader
    if (teamLeaderId) {
      const leaderMembership = await prisma.teamMembership.findFirst({
        where: {
          userId: teamLeaderId,
          teamId,
          role: 'leader'
        }
      })

      if (!leaderMembership) {
        return NextResponse.json({ error: 'Invalid team leader for this team' }, { status: 400 })
      }
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: user.id,
        teamId,
        teamLeaderId,
        speckleUrl: bimSource === 'speckle' ? speckleUrl : null
      },
      include: {
        _count: {
          select: {
            tasks: true,
            models: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    })

    // Handle file upload
    if (file && bimSource === 'local') {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'models')
      
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const fileName = `${Date.now()}-${file.name}`
      const filePath = join(uploadsDir, fileName)
      
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      await prisma.model.create({
        data: {
          projectId: project.id,
          name: `${name} - Model`,
          uploadedBy: user.id,
          source: 'local',
          filePath: `/uploads/models/${fileName}`,
          fileSize: file.size,
          format: 'ifc'
        }
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: project.id,
        action: 'PROJECT_CREATED',
        details: { 
          projectName: name, 
          teamId, 
          teamLeaderId,
          bimSource 
        }
      }
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Create project with upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
