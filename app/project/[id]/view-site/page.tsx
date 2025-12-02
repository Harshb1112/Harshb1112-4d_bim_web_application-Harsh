import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import ViewSiteClient from '@/components/view-site/ViewSiteClient'
import LoginRequiredPage from '@/components/view-site/LoginRequiredPage'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    return null // Return null instead of redirect
  }

  const user = verifyToken(token)
  if (!user) {
    return null
  }

  return user
}

async function getProject(projectId: string) {
  const projectIdInt = parseInt(projectId)

  if (isNaN(projectIdInt)) {
    notFound()
  }

  const project = await prisma.project.findUnique({
    where: { id: projectIdInt },
    include: {
      siteCameras: {
        where: { isActive: true }
      },
      team: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, fullName: true }
              }
            }
          }
        }
      }
    }
  })

  if (!project) {
    notFound()
  }

  return {
    ...project,
    startDate: project.startDate?.toISOString() || null,
    endDate: project.endDate?.toISOString() || null,
    createdAt: project.createdAt.toISOString(),
    siteCameras: project.siteCameras.map((cam) => ({
      ...cam,
      lastPingAt: cam.lastPingAt?.toISOString() || null,
      createdAt: cam.createdAt.toISOString()
    }))
  }
}

export default async function ViewSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const project = await getProject(id)

  // If user is not logged in, show login required page
  if (!user) {
    return <LoginRequiredPage projectId={id} projectName={project.name} />
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ViewSiteClient project={project} user={user} />
    </div>
  )
}
