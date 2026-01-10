import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { Button } from '@/components/ui/button'
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
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gantt Chart</h1>
            <p className="text-gray-500 dark:text-gray-400">Gantt chart view of all projects and tasks</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </Button>
          </Link>
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
