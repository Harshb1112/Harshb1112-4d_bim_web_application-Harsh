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
    
    let startVariance = 0
    let endVariance = 0
    if (actualStart && plannedStart) startVariance = differenceInDays(actualStart, plannedStart)
    if (actualEnd && plannedEnd) endVariance = differenceInDays(actualEnd, plannedEnd)

    return (
      <div className="space-y-2">
        {/* Header with back button */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{task.name}</h3>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {getStatusBadge(progressStatus.status)}
            <button 
              onClick={() => onTaskSelect(null)} 
              className="text-xs text-blue-600 hover:underline ml-2"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <Progress value={task.progress || 0} className="h-1.5 flex-1" />
          <span className="text-xs font-bold text-gray-700">{task.progress || 0}%</span>
        </div>

        {/* Compact dates */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-semibold text-blue-800">Planned</div>
            <div className="text-blue-700">{formatDate(task.startDate)} - {formatDate(task.endDate)}</div>
          </div>
          {mode === 'actual' && (actualStart || actualEnd) && (
            <div className="bg-green-50 p-2 rounded">
              <div className="font-semibold text-green-800">Actual</div>
              <div className="text-green-700">{formatDate(task.actualStartDate)} - {formatDate(task.actualEndDate)}</div>
              {(startVariance !== 0 || endVariance !== 0) && (
                <div className={startVariance > 0 || endVariance > 0 ? 'text-red-600' : 'text-green-600'}>
                  Variance: {startVariance > 0 ? '+' : ''}{startVariance}d / {endVariance > 0 ? '+' : ''}{endVariance}d
                </div>
              )}
            </div>
          )}
        </div>

        {/* Elements count */}
        <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3 text-gray-500" />
            <span className="text-gray-600">Linked Elements</span>
          </div>
          <Badge variant="secondary" className="text-xs">{task.elementCount || task.elementLinks?.length || 0}</Badge>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Task Information</span>
          </div>
          {activeTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeTasks.length} active</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        {selectedTask ? (
          <ScrollArea className="h-[180px] pr-2">
            {renderTaskDetails(selectedTask)}
          </ScrollArea>
        ) : activeTasks.length > 0 ? (
          <ScrollArea className="h-[180px] pr-2">
            <div className="space-y-1.5">
              {activeTasks.map((task) => {
                const progressStatus = getProgressStatus(task)
                const StatusIcon = progressStatus.icon
                
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskSelect(task)}
                    className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate text-sm">{task.name}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs font-medium text-gray-600">{task.progress || 0}%</span>
                        <StatusIcon className={`h-3.5 w-3.5 text-${progressStatus.color}-600`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Progress value={task.progress || 0} className="h-1 flex-1 mr-2" />
                      {task.elementCount > 0 && (
                        <span className="text-xs text-gray-500">{task.elementCount} elem</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No active tasks at current date</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
