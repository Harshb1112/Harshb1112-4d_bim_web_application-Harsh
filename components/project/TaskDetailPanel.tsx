'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Box,
  Calendar,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  X
} from 'lucide-react'
import { format } from 'date-fns'

interface TaskDetailPanelProps {
  task: any
  onClose: () => void
  onFocusElements: (elementIds: string[]) => void
  onUpdateStatus: (taskId: number, status: string) => void
  onUpdateProgress: (taskId: number, progress: number) => void
}

export default function TaskDetailPanel({
  task,
  onClose,
  onFocusElements,
  onUpdateStatus,
  onUpdateProgress
}: TaskDetailPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const elementsByType = task.elementLinks?.reduce((acc: any, link: any) => {
    const type = link.element?.category || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {}) || {}

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      await onUpdateStatus(task.id, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleFocusElements = () => {
    const elementIds = task.elementLinks?.map((link: any) => link.element.guid) || []
    onFocusElements(elementIds)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-500'
      case 'in_progress':
        return 'bg-yellow-500'
      case 'completed':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{task.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(task.status)}>
                {getStatusIcon(task.status)}
                <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
              </Badge>
              {task.priority && (
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {task.description && (
          <div>
            <h4 className="text-sm font-semibold mb-1">Description</h4>
            <p className="text-sm text-gray-600">{task.description}</p>
          </div>
        )}

        <Separator />

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Progress</h4>
            <span className="text-sm font-medium">{Math.round(task.progress)}%</span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>

        <Separator />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          {task.startDate && (
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Calendar className="h-3 w-3" />
                Start Date
              </div>
              <p className="text-sm font-medium">
                {format(new Date(task.startDate), 'MMM dd, yyyy')}
              </p>
            </div>
          )}
          {task.endDate && (
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Calendar className="h-3 w-3" />
                End Date
              </div>
              <p className="text-sm font-medium">
                {format(new Date(task.endDate), 'MMM dd, yyyy')}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Assignment */}
        <div className="space-y-2">
          {task.assignee && (
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <User className="h-3 w-3" />
                Assignee
              </div>
              <p className="text-sm font-medium">{task.assignee.fullName}</p>
            </div>
          )}
          {task.team && (
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Users className="h-3 w-3" />
                Team
              </div>
              <p className="text-sm font-medium">{task.team.name}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Linked Elements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-1">
              <Box className="h-4 w-4" />
              Linked Elements ({task.elementLinks?.length || 0})
            </h4>
            {task.elementLinks?.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleFocusElements}
              >
                <Eye className="h-3 w-3 mr-1" />
                Focus
              </Button>
            )}
          </div>

          {task.elementLinks?.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {Object.entries(elementsByType).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {type}: {count as number}
                  </Badge>
                ))}
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-gray-50 rounded">
                {task.elementLinks.slice(0, 10).map((link: any) => (
                  <div
                    key={link.id}
                    className="text-xs p-2 bg-white rounded border flex items-center justify-between"
                  >
                    <span className="truncate">
                      {link.element.guid.slice(0, 16)}...
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {link.element.category}
                    </Badge>
                  </div>
                ))}
                {task.elementLinks.length > 10 && (
                  <p className="text-xs text-gray-500 text-center py-1">
                    +{task.elementLinks.length - 10} more elements
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No elements linked to this task</p>
          )}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Quick Actions</h4>
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant={task.status === 'todo' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('todo')}
              disabled={isUpdating}
              className="text-xs"
            >
              Not Started
            </Button>
            <Button
              size="sm"
              variant={task.status === 'in_progress' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
              className="text-xs"
            >
              In Progress
            </Button>
            <Button
              size="sm"
              variant={task.status === 'completed' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
              className="text-xs"
            >
              Completed
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
