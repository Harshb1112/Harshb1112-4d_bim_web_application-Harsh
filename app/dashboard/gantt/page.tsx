import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import GanttChartView from '@/components/dashboard/GanttChartView'

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

export default async function GanttPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Project Timeline</h1>
              <p className="text-gray-500">Gantt chart view of all projects and tasks</p>
            </div>
          </div>
        </div>

        {/* Gantt Chart - Will show all projects */}
        <GanttChartView 
          projectId={0} // 0 means all projects
          userRole={user.role}
          userId={user.id}
        />
      </div>
    </div>
  )
}
