import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import UserProfileForm from '@/components/profile/UserProfileForm'
import DashboardHeader from '@/components/dashboard/DashboardHeader' // Re-use dashboard header for consistency
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { User, Lock } from 'lucide-react'

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

  // Fetch full user data from DB to ensure it's fresh
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  if (!dbUser) {
    redirect('/login') // User not found in DB
  }

  return dbUser
}

export default async function ProfilePage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your account settings and personal information.</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>Update your name and email address.</CardDescription>
              </CardHeader>
              <CardContent>
                <UserProfileForm user={user} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Change Password</span>
                </CardTitle>
                <CardDescription>Update your account password.</CardDescription>
              </CardHeader>
              <CardContent>
                <UserProfileForm user={user} isPasswordForm={true} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}