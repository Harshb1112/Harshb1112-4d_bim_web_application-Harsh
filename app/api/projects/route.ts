import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Disable body size limit for this route
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    let projects

    if (user.role === 'admin' || user.role === 'manager') {
      projects = await prisma.project.findMany({
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
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else if (user.role === 'team_leader') {
      projects = await prisma.project.findMany({
        where: {
          OR: [
            {
              team: {
                members: {
                  some: {
                    userId: user.id,
                    role: 'leader'
                  }
                }
              }
            },
            {
              teamLeaderId: user.id
            }
          ]
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else {
      projects = await prisma.project.findMany({
        where: {
          team: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
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
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Only admin and manager can create projects' }, { status: 403 })
    }

    let name: string = ''
    let description: string = ''
    let startDate: string = ''
    let endDate: string = ''
    let status: string = 'active'
    let teamId: number | null = null
    let teamLeaderId: number | null = null
    let projectImage: File | null = null

    // Determine content type and parse body accordingly
    const contentType = request.headers.get('content-type') || ''
    
    try {
      if (contentType.includes('multipart/form-data')) {
        // Handle FormData (new format with image)
        const formData = await request.formData()
        
        name = formData.get('name') as string || ''
        description = formData.get('description') as string || ''
        startDate = formData.get('startDate') as string || ''
        endDate = formData.get('endDate') as string || ''
        status = formData.get('status') as string || 'active'
        const teamIdStr = formData.get('teamId') as string
        const teamLeaderIdStr = formData.get('teamLeaderId') as string
        
        teamId = teamIdStr ? parseInt(teamIdStr) : null
        teamLeaderId = teamLeaderIdStr ? parseInt(teamLeaderIdStr) : null
        
        const imageFile = formData.get('image') as File
        if (imageFile && imageFile.size > 0) {
          projectImage = imageFile
        }
      } else {
        // Handle JSON (legacy format)
        const projectData = await request.json()
        name = projectData.name
        description = projectData.description
        startDate = projectData.startDate
        endDate = projectData.endDate
        status = projectData.status || 'active'
        teamId = projectData.teamId
        teamLeaderId = projectData.teamLeaderId
      }
    } catch (e) {
      console.error('Request body parsing error:', e)
      return NextResponse.json({ 
        error: 'Failed to parse request body',
        details: e instanceof Error ? e.message : String(e)
      }, { status: 400 })
    }

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

    // Handle project image upload
    let imagePath: string | null = null
    if (projectImage) {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'projects')
      
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const fileName = `${Date.now()}-${projectImage.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const filePath = join(uploadsDir, fileName)
      
      const bytes = await projectImage.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      imagePath = `/uploads/projects/${fileName}`
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        image: imagePath,
        status: status || 'active',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: user.id,
        teamId,
        teamLeaderId
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
          bimSource: 'manual' 
        }
      }
    })
    
    // 🔔 AUTOMATIC NOTIFICATION: Notify team members about new project
    try {
      const { createNotification } = await import('@/lib/create-notification')
      const creatorUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { fullName: true }
      })
      
      // Get all team members
      const teamMembers = await prisma.teamMembership.findMany({
        where: { teamId },
        select: { userId: true }
      })
      
      // Send notification to all team members (except creator)
      for (const member of teamMembers) {
        if (member.userId !== user.id) {
          await createNotification({
            userId: member.userId,
            type: 'project_updated',
            title: '🏗️ New Project Created',
            body: `${creatorUser?.fullName || 'Someone'} created a new project: ${name}`,
            url: `/project/${project.id}`
          })
        }
      }
      console.log('[Project Creation] ✅ Notifications sent to', teamMembers.length - 1, 'team members')
    } catch (notifError) {
      console.error('[Project Creation] Failed to send notifications:', notifError)
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Create project error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
