/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { 
  Upload, 
  CheckCircle2, 
  Building2, 
  Users,
  Clock
} from 'lucide-react'

interface Activity {
  id: number
  action: string
  details?: any
  timestamp: Date
  user?: {
    fullName: string
  }
  project: {
    name: string
  }
}

interface RecentActivityProps {
  activities: Activity[]
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'PROJECT_CREATED':
      return <Building2 className="h-4 w-4 text-blue-600" />
    case 'MODEL_UPLOADED':
      return <Upload className="h-4 w-4 text-green-600" />
    case 'TASK_CREATED':
      return <CheckCircle2 className="h-4 w-4 text-purple-600" />
    case 'USER_ADDED':
      return <Users className="h-4 w-4 text-orange-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-600" />
  }
}

const getActivityMessage = (activity: Activity) => {
  const userName = activity.user?.fullName || 'Someone'
  const projectName = activity.project.name
  
  switch (activity.action) {
    case 'PROJECT_CREATED':
      return `${userName} created project "${projectName}"`
    case 'MODEL_UPLOADED':
      const modelName = activity.details?.modelName || 'a model'
      return `${userName} uploaded ${modelName} to "${projectName}"`
    case 'TASK_CREATED':
      const taskName = activity.details?.taskName || 'a task'
      return `${userName} created task "${taskName}" in "${projectName}"`
    case 'USER_ADDED':
      return `${userName} was added to "${projectName}"`
    default:
      return `${userName} performed an action in "${projectName}"`
  }
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {getActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}