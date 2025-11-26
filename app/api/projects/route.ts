import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    const contentType = request.headers.get('content-type') || ''
    let projectData: any
    let uploadedFile: File | null = null

    // Handle FormData (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const projectDataStr = formData.get('projectData') as string
      
      if (file) {
        uploadedFile = file
      }
      
      if (projectDataStr) {
        projectData = JSON.parse(projectDataStr)
      }
    } else {
      // Handle JSON
      projectData = await request.json()
    }

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

    // Handle different BIM sources
    if (bimSource && bimSource !== 'none') {
      let modelData: any = {
        projectId: project.id,
        name: `${name} - Model`,
        uploadedBy: user.id,
        source: bimSource
      }

      if (bimSource === 'speckle') {
        modelData.sourceUrl = speckleUrl
        modelData.format = 'speckle'
      } 
      else if (bimSource === 'local' && uploadedFile) {
        // Save file to disk
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'models')
        
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true })
        }

        const fileName = `${Date.now()}-${uploadedFile.name}`
        const filePath = join(uploadsDir, fileName)
        
        const bytes = await uploadedFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        modelData.filePath = `/uploads/models/${fileName}`
        modelData.fileSize = uploadedFile.size
        modelData.format = 'ifc'
      }
      else if (bimSource === 'acc' || bimSource === 'drive') {
        // Store Autodesk URN and file URL
        modelData.sourceId = autodeskUrn
        modelData.sourceUrl = autodeskFileUrl || null
        modelData.source = bimSource === 'acc' ? 'autodesk_construction_cloud' : 'autodesk_drive'
        modelData.format = 'autodesk'
      }

      // Create model record
      await prisma.model.create({
        data: modelData
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
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
