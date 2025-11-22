import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest, hashPassword, generateRandomPassword } from '@/lib/auth'

// POST - Add a new member to a project
export async function POST(
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

    // Check if user has permission (admin, manager, or team leader of this project's team)
    if (user.role !== 'admin' && user.role !== 'manager') {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          team: {
            members: {
              some: {
                userId: user.id,
                role: 'leader'
              }
            }
          }
        }
      })
      
      if (!project) {
        return NextResponse.json({ error: 'Forbidden: Only admins, managers, or team leaders can add members' }, { status: 403 })
      }
    }

    const { fullName, email, role } = await request.json()
    if (!fullName || !email || !role) {
      return NextResponse.json({ error: 'Full name, email, and role are required' }, { status: 400 })
    }

    let userToAdd = await prisma.user.findUnique({ where: { email } })
    let temporaryPassword = null

    if (!userToAdd) {
      // User does not exist, create a new user with a temporary password
      temporaryPassword = generateRandomPassword()
      const passwordHash = await hashPassword(temporaryPassword)

      userToAdd = await prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          role: 'viewer', // New users default to viewer role, can be changed in project
        },
      })

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          projectId,
          action: 'USER_INVITED_AND_CREATED',
          details: { invitedEmail: email, invitedRole: role, temporaryPassword: temporaryPassword },
        },
      })
    } else {
      // User exists, just add them to the project
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          projectId,
          action: 'USER_ADDED_TO_PROJECT',
          details: { memberEmail: email, role },
        },
      })
    }

    const existingMember = await prisma.projectUser.findFirst({
      where: { userId: userToAdd.id, projectId },
    })
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }

    const newMember = await prisma.projectUser.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role,
      },
      include: {
        user: {
          select: { fullName: true, email: true, role: true },
        },
      },
    })

    return NextResponse.json({ member: newMember, temporaryPassword })
  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a member from a project
export async function DELETE(
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

    // Check if user has permission (admin, manager, or team leader of this project's team)
    if (user.role !== 'admin' && user.role !== 'manager') {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          team: {
            members: {
              some: {
                userId: user.id,
                role: 'leader'
              }
            }
          }
        }
      })
      
      if (!project) {
        return NextResponse.json({ error: 'Forbidden: Only admins, managers, or team leaders can remove members' }, { status: 403 })
      }
    }

    const { projectUserId } = await request.json()
    if (!projectUserId) {
      return NextResponse.json({ error: 'Project User ID is required' }, { status: 400 })
    }

    const memberToRemove = await prisma.projectUser.findUnique({
      where: { id: projectUserId },
      include: { user: true },
    })

    if (!memberToRemove || memberToRemove.projectId !== projectId) {
      return NextResponse.json({ error: 'Member not found in this project' }, { status: 404 })
    }

    // Prevent admin from removing themselves if they are the last admin
    if (memberToRemove.userId === user.id && memberToRemove.role === 'admin') {
      const adminCount = await prisma.projectUser.count({
        where: { projectId, role: 'admin' },
      })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 })
      }
    }

    await prisma.projectUser.delete({ where: { id: projectUserId } })

    await prisma.activityLog.create({
      data: {       userId: user.id,
        projectId,
        action: 'USER_REMOVED',
        details: { memberEmail: memberToRemove.user.email },
      },
    })

    return NextResponse.json({ success: true, message: 'Member removed' })
  } catch (error) {   console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}