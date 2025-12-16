"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Users,
  User,
  Shield,
  CheckCircle2
} from "lucide-react"
import { format, addDays, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, eachMonthOfInterval } from "date-fns"

interface Task {
  id: number
  name: string
  startDate: Date
  endDate: Date
  progress: number
  assignee?: {
    id: number
    fullName: string
    role: string
  }
  team?: {
    id: number
    name: string
  }
  status: string
  color?: string
}

interface GanttChartViewProps {
  projectId: number
  userRole: string
  userId: number
}

type ViewMode = "week" | "month" | "year" | "2years" | "3years"

export default function GanttChartView({ projectId: initialProjectId, userRole, userId }: GanttChartViewProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId === 0 ? "all" : initialProjectId.toString())
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newProgress, setNewProgress] = useState<number>(0)
  const [newStatus, setNewStatus] = useState<string>("todo")
  const [updating, setUpdating] = useState(false)

  // Fetch initial data
  useEffect(() => {
    fetchProjects()
    fetchTeams()
    fetchUsers()
  }, [])

  // Fetch tasks when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchTasks()
    }
  }, [selectedProject])

  // Auto-adjust currentDate to show tasks when they load
  useEffect(() => {
    if (tasks.length > 0) {
      // Find the earliest task start date
      const taskDates = tasks.map(t => t.startDate.getTime()).filter(d => !isNaN(d))
      if (taskDates.length > 0) {
        const earliestDate = new Date(Math.min(...taskDates))
        // Only adjust if current view doesn't show any tasks
        const timelineStart = viewMode === "week" 
          ? startOfWeek(currentDate)
          : viewMode === "month"
          ? startOfMonth(currentDate)
          : startOfYear(currentDate)
        
        const daysToShow = viewMode === "week" ? 7 : viewMode === "month" ? 30 : viewMode === "year" ? 365 : viewMode === "2years" ? 730 : 1095
        const timelineEnd = addDays(timelineStart, daysToShow)
        
        // Check if any task is visible in current timeline
        const anyTaskVisible = tasks.some(t => 
          t.startDate <= timelineEnd && t.endDate >= timelineStart
        )
        
        // If no tasks visible, move to earliest task date
        if (!anyTaskVisible) {
          setCurrentDate(earliestDate)
        }
      }
    }
  }, [tasks])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', { credentials: 'include' })
      const data = await res.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    }
  }

  const fetchTasks = async () => {
    setLoading(true)
    try {
      let url = selectedProject === "all" 
        ? '/api/tasks/all' // All projects
        : `/api/projects/${selectedProject}/tasks` // Specific project
      
      const res = await fetch(url, {
        credentials: 'include'
      })
      const data = await res.json()
      if (data.tasks) {
        const formattedTasks = data.tasks.map((t: any) => ({
          ...t,
          startDate: t.startDate ? new Date(t.startDate) : new Date(),
          endDate: t.endDate ? new Date(t.endDate) : addDays(new Date(), 7)
        }))
        setTasks(formattedTasks)
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams', { credentials: 'include' })
      const data = await res.json()
      if (data.teams) setTeams(data.teams)
    } catch (error) {
      console.error("Failed to fetch teams:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      const data = await res.json()
      if (data.users) setUsers(data.users)
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  // Filter tasks based on role and filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Role-based filtering
    if (userRole === "viewer") {
      // Viewer can only see tasks assigned to them (read-only)
      filtered = filtered.filter(t => t.assignee?.id === userId)
    } else if (userRole === "member") {
      // Member sees only their assigned tasks
      filtered = filtered.filter(t => t.assignee?.id === userId)
    } else if (userRole === "team_leader") {
      // Team leader sees all tasks in their team
      const userTeam = teams.find(t => t.teamLeaderId === userId)
      if (userTeam) {
        filtered = filtered.filter(t => t.team?.id === userTeam.id)
      } else {
        // Fallback: show tasks assigned to them
        filtered = filtered.filter(t => t.assignee?.id === userId)
      }
    } else if (userRole === "manager") {
      // Manager sees only their teams' tasks
      const managerTeams = teams.filter(t => t.managerId === userId).map(t => t.id)
      filtered = filtered.filter(t => t.team?.id && managerTeams.includes(t.team.id))
    }
    // Admin sees all tasks (no filtering)

    // Apply additional filters
    if (selectedTeam !== "all") {
      filtered = filtered.filter(t => t.team?.id === parseInt(selectedTeam))
    }
    if (selectedUser !== "all") {
      filtered = filtered.filter(t => t.assignee?.id === parseInt(selectedUser))
    }
    if (selectedRole !== "all") {
      filtered = filtered.filter(t => t.assignee?.role === selectedRole)
    }

    return filtered
  }, [tasks, userRole, userId, selectedTeam, selectedUser, selectedRole, teams])

  // Calculate timeline based on tasks' actual date range
  const timeline = useMemo(() => {
    const tasksToUse = tasks.length > 0 ? tasks : filteredTasks
    
    if (tasksToUse.length > 0) {
      // Collect ALL dates (both start and end) to find true min/max
      const allDates: number[] = []
      
      tasksToUse.forEach(t => {
        if (t.startDate && !isNaN(t.startDate.getTime())) {
          allDates.push(t.startDate.getTime())
        }
        if (t.endDate && !isNaN(t.endDate.getTime())) {
          allDates.push(t.endDate.getTime())
        }
      })
      
      if (allDates.length > 0) {
        const earliestDate = new Date(Math.min(...allDates))
        const latestDate = new Date(Math.max(...allDates))
        
        // Add padding (3 days before and after)
        const start = addDays(earliestDate, -3)
        const end = addDays(latestDate, 3)
        
        // Calculate total days
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        
        // For very long ranges (> 90 days), show months instead of days
        if (totalDays > 90) {
          return eachMonthOfInterval({ start, end })
        } else {
          return eachDayOfInterval({ start, end })
        }
      }
    }
    
    // Fallback: use current date based view if no tasks
    const start = viewMode === "week" 
      ? startOfWeek(currentDate)
      : viewMode === "month"
      ? startOfMonth(currentDate)
      : startOfYear(currentDate)

    const daysToShow = viewMode === "week" 
      ? 7 
      : viewMode === "month" 
      ? 30 
      : viewMode === "year"
      ? 365
      : viewMode === "2years"
      ? 730
      : 1095

    const end = addDays(start, daysToShow)

    if (viewMode === "week" || viewMode === "month") {
      return eachDayOfInterval({ start, end })
    } else {
      return eachMonthOfInterval({ start, end })
    }
  }, [tasks, filteredTasks, currentDate, viewMode])

  const getTaskPosition = (task: Task) => {
    const timelineStart = timeline[0]
    const timelineEnd = timeline[timeline.length - 1]
    
    // Handle case where endDate is before startDate (swap them)
    const taskStartTime = Math.min(task.startDate.getTime(), task.endDate.getTime())
    const taskEndTime = Math.max(task.startDate.getTime(), task.endDate.getTime())
    
    const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
    const taskStartDays = Math.max(0, Math.ceil((taskStartTime - timelineStart.getTime()) / (1000 * 60 * 60 * 24)))
    const taskDuration = Math.max(1, Math.ceil((taskEndTime - taskStartTime) / (1000 * 60 * 60 * 24)))
    
    const left = (taskStartDays / totalDays) * 100
    const width = (taskDuration / totalDays) * 100
    
    return { left: `${Math.min(left, 100)}%`, width: `${Math.max(Math.min(width, 100 - left), 2)}%` }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "bg-green-500"
      case "in_progress": return "bg-blue-500"
      case "todo": return "bg-gray-400"
      default: return "bg-gray-400"
    }
  }

  const navigate = (direction: "prev" | "next") => {
    const days = viewMode === "week" ? 7 : viewMode === "month" ? 30 : 365
    setCurrentDate(prev => addDays(prev, direction === "next" ? days : -days))
  }

  const handleTaskClick = (task: Task) => {
    // Dashboard Gantt Chart: Admin and Manager can update ANY task (for corrections)
    // Others can only view
    if (userRole === "admin" || userRole === "manager") {
      setSelectedTask(task)
      setNewProgress(task.progress)
      setNewStatus(task.status)
    } else {
      // Others can only view - show info but don't allow editing
      alert('Only Admin and Manager can update tasks from the dashboard. Please go to the project page to update your assigned tasks.')
    }
  }

  const handleUpdateTask = async () => {
    if (!selectedTask) return
    
    setUpdating(true)
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          progress: newProgress,
          status: newStatus
        })
      })

      if (res.ok) {
        // Refresh tasks
        await fetchTasks()
        setSelectedTask(null)
      } else {
        alert('Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Error updating task')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading Gantt Chart...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-[calc(100vh-8rem)] flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Calendar className="h-7 w-7" />
              Project Gantt Chart
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Visual timeline of all project tasks and dependencies
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-base px-4 py-2">
            {filteredTasks.length} Tasks
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 flex flex-col overflow-hidden">
        {/* Project Info */}
        {selectedProject !== "all" && projects.length > 0 && (
          <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold text-xl text-gray-900 dark:text-white">
                  {projects.find(p => p.id.toString() === selectedProject)?.name}
                </h3>
                <p className="text-base text-gray-600 dark:text-gray-400">
                  {projects.find(p => p.id.toString() === selectedProject)?.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  {projects.find(p => p.id.toString() === selectedProject)?.team && (
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {projects.find(p => p.id.toString() === selectedProject)?.team?.name}
                    </Badge>
                  )}
                  {projects.find(p => p.id.toString() === selectedProject)?.teamLeader && (
                    <Badge variant="outline">
                      <User className="h-3 w-3 mr-1" />
                      {projects.find(p => p.id.toString() === selectedProject)?.teamLeader?.fullName}
                    </Badge>
                  )}
                  <span className="text-gray-500">
                    {filteredTasks.length} tasks
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-lg flex-shrink-0">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* View Mode */}
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-gray-500" />
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">1 Year</SelectItem>
                <SelectItem value="2years">2 Years</SelectItem>
                <SelectItem value="3years">3 Years</SelectItem>
              </SelectContent>
            </Select>
            <ZoomIn className="h-4 w-4 text-gray-500" />
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-32 text-center">
              {format(currentDate, viewMode === "week" ? "MMM dd, yyyy" : "MMMM yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Filters */}
          {(userRole === "admin" || userRole === "manager") && (
            <>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="team_leader">Team Leader</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Gantt Chart */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col">
          {/* Timeline Header */}
          <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex">
              <div className="w-80 p-4 border-r border-gray-200 dark:border-gray-700 font-semibold text-base text-gray-900 dark:text-white">Task Name</div>
              <div className="flex-1 flex">
                {timeline.map((date, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 p-3 text-center text-sm font-medium border-r last:border-r-0"
                  >
                    {viewMode === "week" || viewMode === "month" ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">{format(date, "EEE")}</div>
                        <div className="text-gray-900 dark:text-white">{format(date, "dd MMM")}</div>
                      </div>
                    ) : (
                      <span className="text-gray-900 dark:text-white">{format(date, "MMM yyyy")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-lg">
                No tasks found. Create tasks to see them here.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const position = getTaskPosition(task)
                return (
                  <div key={task.id} className="flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[80px]">
                    <div className="w-80 p-3 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center">
                      <div className="font-semibold text-base truncate text-gray-900 dark:text-white">{task.name}</div>
                      {selectedProject === "all" && (task as any).project && (
                        <div className="text-sm text-blue-600 font-medium mt-1.5">
                          📁 {(task as any).project.name}
                        </div>
                      )}
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        📅 {format(task.startDate, "dd MMM yyyy")} - {format(task.endDate, "dd MMM yyyy")}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        👤 {task.assignee?.fullName || "Unassigned"}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {task.team && (
                          <Badge variant="outline" className="text-xs">
                            {task.team.name}
                          </Badge>
                        )}
                        {task.assignee?.role && (
                          <Badge variant="secondary" className="text-xs">
                            {task.assignee.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 relative p-3 flex items-center">
                      <div 
                        className={`absolute h-10 rounded-lg ${getStatusColor(task.status)} opacity-90 hover:opacity-100 transition-all cursor-pointer group shadow-md`}
                        style={position}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="h-full flex items-center px-3">
                          <div className="text-sm text-white font-bold truncate">
                            {task.progress}%
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div 
                          className="absolute bottom-0 left-0 h-1.5 bg-white/60 rounded-b-lg transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute hidden group-hover:block bottom-full left-0 mb-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-20">
                          <div className="font-semibold text-base">{task.name}</div>
                          <div className="mt-2">
                            {format(task.startDate, "MMM dd")} - {format(task.endDate, "MMM dd")}
                          </div>
                          <div>Progress: {task.progress}%</div>
                          <div>Status: {task.status}</div>
                          <div className="mt-2 text-xs text-blue-300">Click to update →</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Stats & Legend */}
        <div className="flex items-center justify-between pt-2 flex-shrink-0">
          <div className="flex items-center gap-8 text-base">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-green-500 rounded"></div>
              <span className="font-medium text-gray-900 dark:text-white">Completed ({filteredTasks.filter(t => t.status === "done").length})</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-blue-500 rounded"></div>
              <span className="font-medium text-gray-900 dark:text-white">In Progress ({filteredTasks.filter(t => t.status === "in_progress").length})</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-gray-400 rounded"></div>
              <span className="font-medium text-gray-900 dark:text-white">To Do ({filteredTasks.filter(t => t.status === "todo").length})</span>
            </div>
          </div>
          
          {filteredTasks.length > 0 && (
            <div className="text-base text-gray-600 dark:text-gray-400 font-medium">
              Average Progress: {Math.round(filteredTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / filteredTasks.length)}%
            </div>
          )}
        </div>
      </CardContent>

      {/* Update Task Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Update Task Progress
              <Badge variant="outline" className="text-xs ml-2">Dashboard - Admin/Manager</Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Admin/Manager Correction Note */}
            {selectedTask?.assignee?.id !== userId && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>⚠️ Correction Mode</strong>
                  <p className="mt-1">You are updating a task assigned to {selectedTask?.assignee?.fullName || 'another user'}. Use this to correct incorrect progress reports or verify completion.</p>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Progress */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Progress: {newProgress}%
              </label>
              <Slider
                value={[newProgress]}
                onValueChange={(value) => setNewProgress(value[0])}
                max={100}
                step={5}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewProgress(0)
                  setNewStatus("todo")
                }}
                className="flex-1"
              >
                Not Started
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewProgress(50)
                  setNewStatus("in_progress")
                }}
                className="flex-1"
              >
                50% Done
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewProgress(100)
                  setNewStatus("done")
                }}
                className="flex-1"
              >
                Complete
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTask(null)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTask}
              disabled={updating}
            >
              {updating ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
