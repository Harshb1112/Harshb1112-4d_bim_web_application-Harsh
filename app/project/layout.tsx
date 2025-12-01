import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import DashboardLayoutClient from '../dashboard/DashboardLayoutClient'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  const tokenUser = verifyToken(token)
  if (!tokenUser) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenUser.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    }
  })

  if (!user) {
    redirect('/login')
  }

  // Get profileImage separately
  let profileImage = null
  try {
    const userWithImage = await prisma.$queryRaw<{profile_image: string | null}[]>`SELECT profile_image FROM users WHERE id = ${tokenUser.id}`
    profileImage = userWithImage[0]?.profile_image || null
  } catch (e) {
    // Column might not exist yet
  }

  return { ...user, profileImage }
}

export default async function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
