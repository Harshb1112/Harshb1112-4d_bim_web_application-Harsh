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
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Gantt chart view of all projects and tasks</p>
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
