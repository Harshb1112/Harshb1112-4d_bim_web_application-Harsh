/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { differenceInDays, format } from 'date-fns'

interface TaskInformationPanelProps {
  activeTasks: any[]
  selectedTask: any | null
  onTaskSelect: (task: any) => void
  currentDate: Date
  mode: 'planned' | 'actual'
}

export default function TaskInformationPanel({
  activeTasks,
  selectedTask,
  onTaskSelect,
  currentDate,
  mode
}: TaskInformationPanelProps) {
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Not set'
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'MMM dd, yyyy')
  }

  const getProgressStatus = (task: any) => {
    if (!task.startDate || !task.endDate) return { status: 'unknown', icon: Minus, color: 'gray' }
    
    const start = new Date(task.startDate)
    const end = new Date(task.endDate)
    const progress = Number(task.progress || 0)
    
    if (progress >= 100) {
      return { status: 'completed', icon: CheckCircle2, color: 'green' }
    }
    
    if (currentDate < start) {
      return { status: 'not-started', icon: Clock, color: 'gray' }
    }
    
    if (currentDate > end && progress < 100) {
      return { status: 'delayed', icon: AlertCircle, color: 'red' }
    }
    
    // Calculate expected progress
    const totalDays = differenceInDays(end, start)
    const daysPassed = differenceInDays(currentDate, start)
    const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0
    
    if (progress >= expectedProgress) {
      return { status: 'on-track', icon: TrendingUp, color: 'blue' }
    } else {
      return { status: 'behind', icon: TrendingDown, color: 'orange' }
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      'completed': { label: 'Completed', variant: 'default' },
      'on-track': { label: 'On Track', variant: 'secondary' },
      'behind': { label: 'Behind Schedule', variant: 'destructive' },
      'delayed': { label: 'Delayed', variant: 'destructive' },
      'not-started': { label: 'Not Started', variant: 'outline' },
      'unknown': { label: 'Unknown', variant: 'outline' }
    }
    
    const config = variants[status] || variants['unknown']
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const renderTaskDetails = (task: any) => {
    const progressStatus = getProgressStatus(task)
    const StatusIcon = progressStatus.icon
    const actualStart = task.actualStartDate ? new Date(task.actualStartDate) : null
    const actualEnd = task.actualEndDate ? new Date(task.actualEndDate) : null
    const plannedStart = task.startDate ? new Date(task.startDate) : null
    const plannedEnd = task.endDate ? new Date(task.endDate) : null
    
    // Calculate variance
    let startVariance = 0
    let endVariance = 0
    if (actualStart && plannedStart) {
      startVariance = differenceInDays(actualStart, plannedStart)
    }
    if (actualEnd && plannedEnd) {
      endVariance = differenceInDays(actualEnd, plannedEnd)
    }

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">{task.name}</h3>
            {getStatusBadge(progressStatus.status)}
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 mt-2">{task.description}</p>
          )}
        </div>

        <Separator />

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-4 w-4 text-${progressStatus.color}-600`} />
              <span className="text-sm font-medium text-gray-700">Progress</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{task.progress || 0}%</span>
          </div>
          <Progress value={task.progress || 0} className="h-2" />
        </div>

        <Separator />

        {/* Dates */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </div>
          
          {/* Planned Dates */}
          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-blue-900 uppercase">Planned</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-blue-600">Start</div>
                <div className="font-medium text-blue-900">{formatDate(task.startDate)}</div>
              </div>
              <div>
                <div className="text-xs text-blue-600">End</div>
                <div className="font-medium text-blue-900">{formatDate(task.endDate)}</div>
              </div>
            </div>
            {task.durationDays && (
              <div className="text-xs text-blue-700">
                Duration: {task.durationDays} days
              </div>
            )}
          </div>

          {/* Actual Dates */}
          {mode === 'actual' && (actualStart || actualEnd) && (
            <div className="bg-green-50 p-3 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-green-900 uppercase">Actual</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-green-600">Start</div>
                  <div className="font-medium text-green-900">{formatDate(task.actualStartDate)}</div>
                  {startVariance !== 0 && (
                    <div className={`text-xs ${startVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {startVariance > 0 ? '+' : ''}{startVariance} days
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-green-600">End</div>
                  <div className="font-medium text-green-900">{formatDate(task.actualEndDate)}</div>
                  {endVariance !== 0 && actualEnd && (
                    <div className={`text-xs ${endVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {endVariance > 0 ? '+' : ''}{endVariance} days
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Elements */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Linked Elements</span>
            </div>
            <Badge variant="secondary">{task.elementCount || task.elementLinks?.length || 0}</Badge>
          </div>
          <p className="text-xs text-gray-500">
            {task.elementCount || task.elementLinks?.length || 0} BIM elements are linked to this task
          </p>
        </div>

        {/* Additional Info */}
        {(task.resource || task.assignee || task.team) && (
          <>
            <Separator />
            <div className="space-y-2">
              {task.resource && (
                <div className="text-sm">
                  <span className="text-gray-600">Resource:</span>
                  <span className="ml-2 font-medium text-gray-900">{task.resource}</span>
                </div>
              )}
              {task.assignee && (
                <div className="text-sm">
                  <span className="text-gray-600">Assignee:</span>
                  <span className="ml-2 font-medium text-gray-900">{task.assignee.name}</span>
                </div>
              )}
              {task.team && (
                <div className="text-sm">
                  <span className="text-gray-600">Team:</span>
                  <span className="ml-2 font-medium text-gray-900">{task.team.name}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>Task Information</span>
        </CardTitle>
        <CardDescription>
          {activeTasks.length > 0 
            ? `${activeTasks.length} active task${activeTasks.length !== 1 ? 's' : ''} at current date`
            : 'No active tasks at current date'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedTask ? (
          <ScrollArea className="h-[500px] pr-4">
            {renderTaskDetails(selectedTask)}
          </ScrollArea>
        ) : activeTasks.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-3">Select a task to view details:</p>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {activeTasks.map((task) => {
                  const progressStatus = getProgressStatus(task)
                  const StatusIcon = progressStatus.icon
                  
                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskSelect(task)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{task.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(task.startDate)} - {formatDate(task.endDate)}
                          </div>
                        </div>
                        <StatusIcon className={`h-4 w-4 text-${progressStatus.color}-600 ml-2 flex-shrink-0`} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Progress value={task.progress || 0} className="h-1.5 flex-1 mr-3" />
                        <span className="text-xs font-medium text-gray-700">{task.progress || 0}%</span>
                      </div>
                      {task.elementCount > 0 && (
                        <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                          <Layers className="h-3 w-3" />
                          <span>{task.elementCount} elements</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No tasks are active at the current simulation date</p>
            <p className="text-xs mt-2">Move the timeline slider to see active tasks</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
