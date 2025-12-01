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

  // Fetch user with profileImage from database
  const user = await prisma.user.findUnique({
    where: { id: tokenUser.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true,
    }
  })

  if (!user) {
    redirect('/login')
  }

  return user
}

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
