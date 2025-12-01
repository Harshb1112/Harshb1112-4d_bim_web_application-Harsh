import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import UserProfileForm from '@/components/profile/UserProfileForm'
import ProfileImageUpload from '../../components/profile/ProfileImageUpload'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { User, Lock, Camera } from 'lucide-react'

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
    redirect('/login')
  }

  // Get profileImage separately (in case schema not synced yet)
  let profileImage = null
  try {
    const userWithImage = await prisma.$queryRaw<{profile_image: string | null}[]>`SELECT profile_image FROM users WHERE id = ${user.id}`
    profileImage = userWithImage[0]?.profile_image || null
  } catch (e) {
    // Column might not exist yet
  }

  return { ...dbUser, profileImage }
}

export default async function ProfilePage() {
  const user = await getCurrentUser()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account settings and personal information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Card */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
              <Camera className="h-5 w-5" />
              <span>Profile Photo</span>
            </CardTitle>
            <CardDescription className="dark:text-gray-400">Upload your profile picture.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileImageUpload user={user} />
          </CardContent>
        </Card>

        {/* Personal Info & Password */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription className="dark:text-gray-400">Update your name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserProfileForm user={user} />
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                <Lock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription className="dark:text-gray-400">Update your account password.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserProfileForm user={user} isPasswordForm={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
