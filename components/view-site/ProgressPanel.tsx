'use client'

import { format } from 'date-fns'
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Users, Hammer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import AddProgressDialog from './AddProgressDialog'

interface ProgressPanelProps {
  progress: {
    overall: number
    completedTasks: number
    totalTasks: number
    todayTasks: any[]
    upcomingTasks: any[]
  } | null
  dailyProgress: any[]
  selectedDate: Date
  projectId?: number
  onRefresh?: () => void
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-500',
  'in-progress': 'bg-blue-500',
  completed: 'bg-green-500',
  delayed: 'bg-red-500'
}

export default function ProgressPanel({ progress, dailyProgress, selectedDate, projectId, onRefresh }: ProgressPanelProps) {
  if (!progress) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No progress data available</p>
        <p className="text-sm mt-2">Tasks will appear here once scheduled</p>
        {projectId && (
          <div className="mt-4">
            <AddProgressDialog projectId={projectId} onProgressAdded={onRefresh} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card className="bg-gradient-to-br from-green-600 to-green-800 border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-100">
            Overall Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">
              {progress.overall.toFixed(1)}%
            </span>
            <span className="text-green-200 mb-1">Complete</span>
          </div>
          <Progress value={progress.overall} className="h-3 mt-3" />
          <div className="flex justify-between mt-2 text-sm text-green-200">
            <span>{progress.completedTasks} completed</span>
            <span>{progress.totalTasks} total tasks</span>
          </div>
        </CardContent>
      </Card>

      {/* Today's Work */}
      <Card className="bg-gray-700 border-gray-600">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-300">
              Work Today ({format(selectedDate, 'MMM d')})
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-600">
              {progress.todayTasks.length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {progress.todayTasks.length > 0 ? (
            <div className="space-y-2">
              {progress.todayTasks.map((task) => (
                <div 
                  key={task.id}
                  className="p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Hammer className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">
                        {task.name}
                      </span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`${statusColors[task.status] || 'bg-gray-500'} text-white text-xs`}
                    >
                      {task.status}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-1.5" />
                  </div>
                  {task.startDate && task.endDate && (
                    <div className="mt-2 text-xs text-gray-500">
                      {format(new Date(task.startDate), 'MMM d')} - {format(new Date(task.endDate), 'MMM d')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active tasks for this date</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Progress Log */}
      {dailyProgress && dailyProgress.length > 0 && (
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Work Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {dailyProgress.map((log) => (
                <div 
                  key={log.id}
                  className="p-2 bg-gray-800 rounded text-sm"
                >
                  <p className="text-white">{log.workDescription}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    {log.teamName && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {log.teamName}
                      </span>
                    )}
                    {log.workersCount && (
                      <span>{log.workersCount} workers</span>
                    )}
                    {log.hoursWorked && (
                      <span>{log.hoursWorked}h worked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tasks */}
      <Card className="bg-gray-700 border-gray-600">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-300">
              Coming Up Next
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          {progress.upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {progress.upcomingTasks.slice(0, 5).map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-gray-800 rounded"
                >
                  <div>
                    <p className="text-sm text-white">{task.name}</p>
                    {task.startDate && (
                      <p className="text-xs text-gray-500">
                        Starts {format(new Date(task.startDate), 'MMM d')}
                      </p>
                    )}
                  </div>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming tasks in next 7 days</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Progress Button */}
      {projectId && (
        <AddProgressDialog projectId={projectId} onProgressAdded={onRefresh} />
      )}
    </div>
  )
}
