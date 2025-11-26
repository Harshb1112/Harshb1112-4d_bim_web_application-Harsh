'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EnhancedSpeckleViewer from '../EnhancedSpeckleViewer'
import FourDSimulationController from '../FourDSimulationController'
import TaskDetailPanel from '../TaskDetailPanel'
import GanttChart from '../GanttChart'
import { toast } from 'sonner'
import { Layers, Calendar, List } from 'lucide-react'

interface FourDBIMTabProps {
  project: any
}

export default function FourDBIMTab({ project }: FourDBIMTabProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'viewer' | 'gantt' | 'simulation'>('viewer')
  const viewerRef = useRef<any>(null)

  // Fetch tasks, teams, and users
  useEffect(() => {
    fetchData()
  }, [project.id])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [tasksRes, teamsRes, usersRes] = await Promise.all([
        fetch(`/api/tasks?projectId=${project.id}`),
        fetch('/api/teams'),
        fetch('/api/users')
      ])

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData.tasks || [])
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData.teams || [])
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load project data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskCreated = () => {
    fetchData()
    toast.success('Task created successfully!')
  }

  const handleFocusElements = useCallback((elementIds: string[]) => {
    if (viewerRef.current && elementIds.length > 0) {
      viewerRef.current.isolateObjects(elementIds, true)
      toast.info(`Focusing on ${elementIds.length} elements`)
      
      // Auto-unfocus after 3 seconds
      setTimeout(() => {
        viewerRef.current?.unIsolateObjects()
      }, 3000)
    }
  }, [])

  const handleUpdateStatus = async (taskId: number, status: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) throw new Error('Failed to update status')

      // Update local state
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, status } : task
        )
      )

      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, status })
      }

      toast.success('Task status updated')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleUpdateProgress = async (taskId: number, progress: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      })

      if (!response.ok) throw new Error('Failed to update progress')

      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, progress } : task
        )
      )

      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, progress })
      }

      toast.success('Progress updated')
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    }
  }

  const handleGanttTaskClick = (task: any) => {
    setSelectedTask(task)
    
    // Focus on task elements in viewer
    if (task.elementLinks && task.elementLinks.length > 0) {
      const elementIds = task.elementLinks.map((link: any) => link.element.guid)
      handleFocusElements(elementIds)
    }
  }

  const handleSimulationTimeChange = (date: Date, activeTasks: any[]) => {
    // This could be used to update UI or trigger other actions
    console.log('Simulation date:', date, 'Active tasks:', activeTasks.length)
  }

  const handleSimulationColorUpdate = (elementColors: Map<string, string>) => {
    // Apply colors to viewer
    if (viewerRef.current) {
      const colorMap: { [key: string]: string } = {}
      elementColors.forEach((color, elementId) => {
        colorMap[elementId] = color
      })
      // viewerRef.current.setColorByProperty('guid', colorMap)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading 4D BIM data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Selector */}
      <Card className="p-4">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="viewer">
              <Layers className="h-4 w-4 mr-2" />
              3D Viewer & Selection
            </TabsTrigger>
            <TabsTrigger value="gantt">
              <Calendar className="h-4 w-4 mr-2" />
              Gantt Timeline
            </TabsTrigger>
            <TabsTrigger value="simulation">
              <List className="h-4 w-4 mr-2" />
              4D Simulation
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Panel - Task Detail (when task selected) */}
        {selectedTask && (
          <div className="lg:col-span-1">
            <TaskDetailPanel
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onFocusElements={handleFocusElements}
              onUpdateStatus={handleUpdateStatus}
              onUpdateProgress={handleUpdateProgress}
            />
          </div>
        )}

        {/* Main View Area */}
        <div className={selectedTask ? 'lg:col-span-3' : 'lg:col-span-4'}>
          {activeView === 'viewer' && (
            <EnhancedSpeckleViewer
              project={project}
              tasks={tasks}
              teams={teams}
              users={users}
              onTaskCreated={handleTaskCreated}
            />
          )}

          {activeView === 'gantt' && (
            <Card className="p-4">
              <GanttChart
                tasks={tasks}
                onTaskClick={handleGanttTaskClick}
              />
            </Card>
          )}

          {activeView === 'simulation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card className="h-[600px]">
                  <EnhancedSpeckleViewer
                    project={project}
                    tasks={tasks}
                    teams={teams}
                    users={users}
                    onTaskCreated={handleTaskCreated}
                  />
                </Card>
              </div>
              <div className="lg:col-span-1">
                <FourDSimulationController
                  tasks={tasks}
                  onTimeChange={handleSimulationTimeChange}
                  onElementColorUpdate={handleSimulationColorUpdate}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
            <div className="text-xs text-gray-600">Total Tasks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-xs text-gray-600">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {tasks.reduce((sum, t) => sum + (t.elementLinks?.length || 0), 0)}
            </div>
            <div className="text-xs text-gray-600">Linked Elements</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
