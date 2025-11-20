/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Calendar, Edit, Save, X, RefreshCw, AlertTriangle } from 'lucide-react'
import GanttChart from '../GanttChart'
import { formatDate, calculateCriticalPath } from '@/lib/utils'
import { toast } from 'sonner'

interface ScheduleManagerProps {
  project: any
  onTaskSelect?: (taskId: string) => void
  selectedTasks?: string[]
}

export default function ScheduleManager({ project, onTaskSelect, selectedTasks }: ScheduleManagerProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editedTask, setEditedTask] = useState<any | null>(null)
  const [criticalPathTasks, setCriticalPathTasks] = useState<Set<number>>(new Set())
  const [showCriticalPath, setShowCriticalPath] = useState(false)

  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchTasks() // Initial fetch

    // Set up polling for real-time-like updates
    fetchIntervalRef.current = setInterval(fetchTasks, 10000) // Poll every 10 seconds

    return () => {
      // Clean up interval on component unmount
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current)
      }
    }
  }, [project.id])

  const fetchTasks = async () => {
    // Only show loading spinner on initial load or explicit refresh
    if (tasks.length === 0) setLoading(true)
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0]
      const response = await fetch(`/api/projects/${project.id}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        
        // Calculate critical path
        const { criticalTasks: newCriticalTasks } = calculateCriticalPath(data.tasks);
        setCriticalPathTasks(newCriticalTasks);

      } else {
        console.error('Failed to fetch tasks.')
        // toast.error('Failed to fetch tasks.'); // Avoid spamming toasts on background polls
      }
    } catch (error) {
      console.error('An error occurred while fetching tasks:', error)
      // toast.error('An error occurred while fetching tasks.'); // Avoid spamming toasts on background polls
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (task: any) => {
    setEditingTaskId(task.id)
    setEditedTask({ ...task })
  }

  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditedTask(null)
  }

  const handleSaveProgress = async () => {
    if (!editedTask) return

    const promise = new Promise(async (resolve, reject) => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0]
        const response = await fetch(`/api/tasks/${editedTask.id}/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            progress: editedTask.progress,
            actualStartDate: editedTask.actualStartDate,
            actualEndDate: editedTask.actualEndDate
          })
        })

        if (response.ok) {
          await fetchTasks() // Refresh data
          handleCancelEdit()
          resolve('Progress updated successfully!')
        } else {
          const errorData = await response.json()
          reject(new Error(errorData.error || 'Failed to save progress'))
        }
      } catch (error) {
        console.error('Error saving progress:', error)
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: 'Saving progress...',
      success: (message) => `${message}`,
      error: (err) => `Error: ${err.message}`,
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setEditedTask((prev: any) => ({ ...prev, [field]: value }))
  }

  const renderTaskRow = (task: any) => {
    const isEditing = editingTaskId === task.id
    const taskData = isEditing ? editedTask : task
    const isCritical = criticalPathTasks.has(task.id)

    return (
      <div key={task.id} className={`p-4 border-b ${selectedTasks?.includes(String(task.id)) ? 'bg-blue-50' : ''} ${isCritical && showCriticalPath ? 'bg-red-50 border-red-200' : ''}`}>
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{task.name}</h4>
              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={handleSaveProgress}><Save className="h-4 w-4 mr-2" />Save</Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Actual Start</Label>
                <Input 
                  type="date" 
                  value={taskData.actualStartDate ? taskData.actualStartDate.split('T')[0] : ''}
                  onChange={(e) => handleInputChange('actualStartDate', e.target.value)}
                />
              </div>
              <div>
                <Label>Actual End</Label>
                <Input 
                  type="date" 
                  value={taskData.actualEndDate ? taskData.actualEndDate.split('T')[0] : ''}
                  onChange={(e) => handleInputChange('actualEndDate', e.target.value)}
                />
              </div>
              <div>
                <Label>Progress: {taskData.progress}%</Label>
                <Slider 
                  value={[taskData.progress]} 
                  onValueChange={(val) => handleInputChange('progress', val[0])}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-6 items-center gap-4">
            <div className="col-span-2 font-medium cursor-pointer flex items-center" onClick={() => onTaskSelect && onTaskSelect(String(task.id))}>
              {isCritical && showCriticalPath && (<AlertTriangle className="h-4 w-4 text-red-600 mr-2"><title>Critical Task</title></AlertTriangle>)}
              {task.name}
            </div>
            <div className="text-sm text-gray-600">{task.startDate ? formatDate(task.startDate) : '-'}</div>
            <div className="text-sm text-gray-600">{task.actualStartDate ? formatDate(task.actualStartDate) : '-'}</div>
            <div className="text-sm text-gray-600">{task.progress}%</div>
            <div className="flex justify-end col-span-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Update Progress
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Schedule</h2>
          <p className="text-sm text-gray-500">Manage tasks, timeline, and actual progress</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant={showCriticalPath ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            disabled={criticalPathTasks.size === 0}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {showCriticalPath ? 'Hide Critical Path' : 'Show Critical Path'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2"><Calendar className="h-5 w-5" /><span>Project Timeline</span></CardTitle>
          <CardDescription>Interactive Gantt chart showing task dependencies and progress</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <GanttChart tasks={tasks} criticalPathTasks={showCriticalPath ? criticalPathTasks : undefined} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Progress</CardTitle>
          <CardDescription>Update actual start/end dates and completion percentage for each task.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b grid grid-cols-6 gap-4 p-4 font-semibold text-sm text-gray-500">
            <div className="col-span-2">Task Name</div>
            <div>Planned Start</div>
            <div>Actual Start</div>
            <div>Progress</div>
            <div className="col-span-2"></div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {tasks.map(renderTaskRow)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}