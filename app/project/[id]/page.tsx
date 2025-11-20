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

async function getProject(projectId: string, userId: number) {
  const project = await prisma.project.findFirst({
    where: {
      id: parseInt(projectId),
      projectUsers: {
        some: {
          userId: userId
        }
      }
    },
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
      }
    }
  })

  if (!project) {
    notFound()
  }

  return project
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const project = await getProject(params.id, user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader project={project} user={user} />
      <ProjectTabs project={project} />
    </div>
  )
}