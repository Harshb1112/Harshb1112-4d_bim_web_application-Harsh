import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import ProjectHeader from '@/components/project/ProjectHeader'
import ProjectTabs from '@/components/project/ProjectTabs'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  const user = verifyToken(token)
  if (!user) {
    redirect('/login')
  }

  return user
}

async function getProject(projectId: string, userId: number, userRole: string) {
  const projectIdInt = parseInt(projectId)
  
  if (isNaN(projectIdInt)) {
    notFound()
  }

  let whereClause: any = {
    id: projectIdInt
  }

  // Apply team-based filtering based on role
  if (userRole === 'admin' || userRole === 'manager') {
    // Admin and Manager can access any project - no additional filters needed
  } else if (userRole === 'team_leader') {
    // Team Leader sees only their team's projects
    whereClause.OR = [
      {
        team: {
          members: {
            some: {
              userId: userId,
              role: 'leader'
            }
          }
        }
      },
      {
        teamLeaderId: userId
      }
    ]
  } else {
    // Viewer sees only their team's projects
    whereClause.team = {
      members: {
        some: {
          userId: userId
        }
      }
    }
  }

  const project = await prisma.project.findFirst({
    where: whereClause,
    include: {
      models: {
        include: {
          _count: {
            select: {
              elements: true
            }
          }
        }
      },
      tasks: {
        include: {
          children: true,
          elementLinks: {
            include: {
              element: true
            }
          }
        }
      },
      projectUsers: {
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              role: true
            }
          }
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
    }
  })

  if (!project) {
    notFound()
  }

  // Serialize Decimal and Date fields for Client Components
  const serializedProject = {
    ...project,
    startDate: project.startDate?.toISOString() || null,
    endDate: project.endDate?.toISOString() || null,
    createdAt: project.createdAt.toISOString(),
    tasks: project.tasks.map(task => ({
      ...task,
      progress: task.progress ? Number(task.progress) : 0,
      startDate: task.startDate?.toISOString() || null,
      endDate: task.endDate?.toISOString() || null,
      actualStartDate: task.actualStartDate?.toISOString() || null,
      actualEndDate: task.actualEndDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      children: task.children.map(child => ({
        ...child,
        progress: child.progress ? Number(child.progress) : 0,
        startDate: child.startDate?.toISOString() || null,
        endDate: child.endDate?.toISOString() || null,
        actualStartDate: child.actualStartDate?.toISOString() || null,
        actualEndDate: child.actualEndDate?.toISOString() || null,
        createdAt: child.createdAt.toISOString()
      })),
      elementLinks: task.elementLinks.map(link => ({
        ...link,
        startDate: link.startDate?.toISOString() || null,
        endDate: link.endDate?.toISOString() || null
      }))
    })),
    models: project.models.map(model => ({
      ...model,
      uploadedAt: model.uploadedAt.toISOString()
    }))
  }

  return serializedProject
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const project = await getProject(id, user.id, user.role)
 
  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      <ProjectHeader project={project} user={user} />
      <ProjectTabs project={project} currentUserRole={user.role} />
    </div>
  )
}
