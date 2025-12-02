/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Calendar, Edit, Save, X, RefreshCw, AlertTriangle, PlusCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import GanttChart from '../GanttChart'
import { formatDate, calculateCriticalPath } from '@/lib/utils'
import { toast } from 'sonner'
import TaskCommentSection from '../TaskCommentSection'
import EditTaskDialog from '../EditTaskDialog'

interface ScheduleManagerProps {
  project: any
  onTaskSelect?: (taskId: string) => void
  selectedTasks?: string[]
  currentUserRole?: string
}

export default function ScheduleManager({ project, onTaskSelect, selectedTasks, currentUserRole }: ScheduleManagerProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editedTask, setEditedTask] = useState<any | null>(null)
  const [criticalPathTasks, setCriticalPathTasks] = useState<Set<number>>(new Set())
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [timeFilter, setTimeFilter] = useState<string>('all')
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<any | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [availableElements, setAvailableElements] = useState<any[]>([])

  // Create-task dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskStartDate, setNewTaskStartDate] = useState('')
  const [newTaskEndDate, setNewTaskEndDate] = useState('')
  const [newTaskDurationDays, setNewTaskDurationDays] = useState<string>('')
  const [creatingTask, setCreatingTask] = useState(false)

  // keep start/end/duration in sync where possible
  const recalcDurationFromDates = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return
    const start = new Date(startStr)
    const end = new Date(endStr)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
    if (end < start) return
    const diffMs = end.getTime() - start.getTime()
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
    setNewTaskDurationDays(days.toString())
  }

  const recalcEndFromDuration = (startStr: string, durationStr: string) => {
    if (!startStr || !durationStr) return
    const d = Number(durationStr)
    if (!Number.isFinite(d) || d < 0) return
    const start = new Date(startStr)
    if (Number.isNaN(start.getTime())) return
    const end = new Date(start)
    end.setDate(end.getDate() + d)
    setNewTaskEndDate(end.toISOString().split('T')[0])
  }

  const canEdit = currentUserRole === 'admin' || currentUserRole === 'manager'

  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch teams, users, elements when edit dialog opens
  useEffect(() => {
    if (showEditDialog) {
      fetchTeamsAndUsers()
      fetchAvailableElements()
    }
  }, [showEditDialog])

  const fetchTeamsAndUsers = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        fetch('/api/teams', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' })
      ])
      if (teamsRes.ok) {
        const data = await teamsRes.json()
        setTeams(data.teams || [])
      }
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching teams/users:', error)
    }
  }

  const fetchAvailableElements = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/models`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        const models = data.models || []
        for (const model of models) {
          const elemResponse = await fetch(`/api/models/${model.id}/elements`, { credentials: 'include' })
          if (elemResponse.ok) {
            const elemData = await elemResponse.json()
            if (elemData.elements && elemData.elements.length > 0) {
              setAvailableElements(elemData.elements)
              break
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching elements:', error)
    }
  }

  const handleOpenEditDialog = (task: any) => {
    setTaskToEdit(task)
    setShowEditDialog(true)
  }

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
      console.log('[ScheduleManager] Token extracted:', token ? `${token.substring(0, 20)}...` : 'NULL')
      if (!token) {
        console.error('No authentication token found in cookies:', document.cookie)
        return
      }
      const response = await fetch(`/api/projects/${project.id}/tasks`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        
        // Calculate critical path
        const { criticalTasks: newCriticalTasks } = calculateCriticalPath(data.tasks);
        setCriticalPathTasks(newCriticalTasks);

      } else {
        console.error('Failed to fetch tasks. Status:', response.status)
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

  const resetNewTaskForm = () => {
    setNewTaskName('')
    setNewTaskDescription('')
    setNewTaskStartDate('')
    setNewTaskEndDate('')
    setNewTaskDurationDays('')
  }

  const handleStartDateChange = (value: string) => {
    setNewTaskStartDate(value)
    recalcDurationFromDates(value, newTaskEndDate)
    if (!newTaskEndDate && newTaskDurationDays) {
      recalcEndFromDuration(value, newTaskDurationDays)
    }
  }

  const handleEndDateChange = (value: string) => {
    setNewTaskEndDate(value)
    recalcDurationFromDates(newTaskStartDate, value)
  }

  const handleDurationChange = (value: string) => {
    setNewTaskDurationDays(value)
    if (newTaskStartDate && value) {
      recalcEndFromDuration(newTaskStartDate, value)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim()) {
      toast.error('Task name is required')
      return
    }

    // front-end validation for date consistency
    if (newTaskStartDate && newTaskEndDate) {
      const s = new Date(newTaskStartDate)
      const eDate = new Date(newTaskEndDate)
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(eDate.getTime()) && eDate < s) {
        toast.error('End date cannot be before start date')
        return
      }
    }
    if (newTaskDurationDays) {
      const d = Number(newTaskDurationDays)
      if (!Number.isFinite(d) || d < 0) {
        toast.error('Duration must be a non-negative number')
        return
      }
    }

    setCreatingTask(true)

    const promise = new Promise(async (resolve, reject) => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0]
        if (!token) {
          throw new Error('You must be logged in to create tasks')
        }

        const response = await fetch(`/api/projects/${project.id}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            name: newTaskName.trim(),
            description: newTaskDescription.trim() || null,
            startDate: newTaskStartDate || null,
            endDate: newTaskEndDate || null,
            durationDays: newTaskDurationDays ? Number(newTaskDurationDays) : null,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create task')
        }

        setIsCreateOpen(false)
        resetNewTaskForm()
        await fetchTasks()
        resolve('Task created successfully')
      } catch (error) {
        reject(error)
      } finally {
        setCreatingTask(false)
      }
    })

    toast.promise(promise, {
      loading: 'Creating task...',
      success: (message) => `${message}`,
      error: (err: any) => `Failed to create task: ${err.message}`,
    })
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
            'Content-Type': 'application/json'
          },
          credentials: 'include',
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
            <div 
              className="col-span-2 font-medium cursor-pointer flex items-center hover:text-blue-600" 
              onClick={() => {
                setSelectedTaskForComments(task)
                onTaskSelect && onTaskSelect(String(task.id))
              }}
            >
              {isCritical && showCriticalPath && (<AlertTriangle className="h-4 w-4 text-red-600 mr-2"><title>Critical Task</title></AlertTriangle>)}
              {task.name}
            </div>
            <div className="text-sm text-gray-600">{task.startDate ? formatDate(task.startDate) : '-'}</div>
            <div className="text-sm text-gray-600">{task.actualStartDate ? formatDate(task.actualStartDate) : '-'}</div>
            <div className="text-sm text-gray-600">{task.progress}%</div>
            <div className="flex justify-end col-span-2 gap-2">
              {canEdit && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(task)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Progress
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleOpenEditDialog(task)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Task
                  </Button>
                </>
              )}
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
          {canEdit && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                  <DialogDescription>
                    Define a new task for this project schedule.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-name">Task Name</Label>
                    <Input
                      id="task-name"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <Input
                      id="task-description"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-start">Start Date</Label>
                      <Input
                        id="task-start"
                        type="date"
                        value={newTaskStartDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-end">End Date</Label>
                      <Input
                        id="task-end"
                        type="date"
                        value={newTaskEndDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-duration">Duration (days)</Label>
                      <Input
                        id="task-duration"
                        type="number"
                        min={0}
                        value={newTaskDurationDays}
                        onChange={(e) => handleDurationChange(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={creatingTask}>
                      {creatingTask && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      {creatingTask ? 'Creating...' : 'Create Task'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2"><Calendar className="h-5 w-5" /><span>Project Timeline</span></CardTitle>
              <CardDescription>Interactive Gantt chart showing task dependencies and progress</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="timeFilter" className="text-sm text-gray-600">View:</Label>
              <select
                id="timeFilter"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="2years">2 Years</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {(() => {
                  const now = new Date()
                  const filtered = tasks.filter(task => {
                    if (!task.startDate) return true
                    const taskDate = new Date(task.startDate)
                    const daysDiff = Math.floor((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    
                    switch(timeFilter) {
                      case 'week': return Math.abs(daysDiff) <= 7
                      case 'month': return Math.abs(daysDiff) <= 30
                      case 'quarter': return Math.abs(daysDiff) <= 90
                      case 'year': return Math.abs(daysDiff) <= 365
                      case '2years': return Math.abs(daysDiff) <= 730
                      default: return true
                    }
                  })
                  return filtered.length
                })()} of {tasks.length} tasks
              </div>
              <GanttChart 
                tasks={tasks.filter(task => {
                  if (timeFilter === 'all' || !task.startDate) return true
                  const now = new Date()
                  const taskDate = new Date(task.startDate)
                  const daysDiff = Math.floor((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  
                  switch(timeFilter) {
                    case 'week': return Math.abs(daysDiff) <= 7
                    case 'month': return Math.abs(daysDiff) <= 30
                    case 'quarter': return Math.abs(daysDiff) <= 90
                    case 'year': return Math.abs(daysDiff) <= 365
                    case '2years': return Math.abs(daysDiff) <= 730
                    default: return true
                  }
                })} 
                criticalPathTasks={showCriticalPath ? criticalPathTasks : undefined} 
              />
            </>
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

      {/* Task Comment Section */}
      {selectedTaskForComments && (
        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 z-10"
            onClick={() => setSelectedTaskForComments(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <TaskCommentSection
            taskId={selectedTaskForComments.id}
            taskName={selectedTaskForComments.name}
          />
        </div>
      )}

      {/* Edit Task Dialog */}
      {taskToEdit && (
        <EditTaskDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          task={taskToEdit}
          projectId={project.id}
          availableElements={availableElements}
          teams={teams}
          users={users}
          onTaskUpdated={() => {
            fetchTasks()
            setShowEditDialog(false)
            setTaskToEdit(null)
          }}
        />
      )}
    </div>
  )
}