/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { Upload, CheckCircle2, Building2, Users, Clock } from 'lucide-react'

interface Activity {
  id: number
  action: string
  details?: any
  timestamp: Date
  user?: { fullName: string } | null
  project: { name: string }
}

interface RecentActivityProps {
  activities: Activity[]
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'PROJECT_CREATED': return <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    case 'MODEL_UPLOADED': return <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
    case 'TASK_CREATED': return <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
    case 'USER_ADDED': return <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
    default: return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
  }
}

const getActivityMessage = (activity: Activity) => {
  const userName = activity.user?.fullName || 'Someone'
  const projectName = activity.project.name
  
  switch (activity.action) {
    case 'PROJECT_CREATED': return `${userName} created project "${projectName}"`
    case 'MODEL_UPLOADED': return `${userName} uploaded ${activity.details?.modelName || 'a model'} to "${projectName}"`
    case 'TASK_CREATED': return `${userName} created task "${activity.details?.taskName || 'a task'}" in "${projectName}"`
    case 'USER_ADDED': return `${userName} was added to "${projectName}"`
    default: return `${userName} performed an action in "${projectName}"`
  }
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
          <Clock className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">{getActivityIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-200">{getActivityMessage(activity)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{formatDateTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
