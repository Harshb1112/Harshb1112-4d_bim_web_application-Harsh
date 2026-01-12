"use client"

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, CheckSquare, DollarSign, Users, Calendar, Activity, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ProjectDashboardProps {
  project: any
}

export default function ProjectDashboard({ project }: ProjectDashboardProps) {
  const [costData, setCostData] = useState({ totalCost: 0, byType: {} as Record<string, number> })

  // Fetch resource costs
  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const res = await fetch(`/api/resources/costs?projectId=${project.id}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setCostData({ totalCost: data.totalCost || 0, byType: data.byType || {} })
        }
      } catch (error) {
        console.error('Failed to fetch costs:', error)
      }
    }
    fetchCosts()
  }, [project.id])

  // Calculate stats from project data
  const stats = useMemo(() => {
    const tasks = project.tasks || []
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length
    const todoTasks = tasks.filter((t: any) => t.status === 'todo' || !t.status).length
    
    // Calculate overall progress
    const overallProgress = totalTasks > 0 
      ? Math.round(tasks.reduce((sum: number, t: any) => sum + (Number(t.progress) || 0), 0) / totalTasks)
      : 0

    // Get team members count from team.members (real data)
    const teamMembers = project.team?.members?.length || project.projectUsers?.length || 1

    // Get upcoming deadlines (tasks with end date in future)
    const now = new Date()
    const upcomingDeadlines = tasks
      .filter((t: any) => t.endDate && new Date(t.endDate) > now && t.status !== 'completed')
      .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 5)

    // Task status distribution
    const statusDistribution = {
      todo: todoTasks,
      in_progress: inProgressTasks,
      completed: completedTasks
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overallProgress,
      teamMembers,
      upcomingDeadlines,
      statusDistribution
    }
  }, [project])


  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500'
      case 'todo': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overallProgress}%</div>
            <Progress value={stats.overallProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.completedTasks} of {stats.totalTasks} tasks completed
            </p>
          </CardContent>
        </Card>

        {/* Total Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {stats.completedTasks}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {stats.inProgressTasks}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{costData.totalCost.toLocaleString('en-IN')}</div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              {costData.byType.labor ? <span>Labor: ₹{costData.byType.labor.toLocaleString('en-IN')}</span> : null}
              {costData.byType.material ? <span>Material: ₹{costData.byType.material.toLocaleString('en-IN')}</span> : null}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Active collaborators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Task Status Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task Status Distribution - Pie Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>Current task breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalTasks > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Pie Chart */}
                <div className="w-full md:w-2/3 h-[280px]">
                  {stats.totalTasks > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: stats.statusDistribution.completed, color: '#22c55e' },
                          { name: 'In Progress', value: stats.statusDistribution.in_progress, color: '#3b82f6' },
                          { name: 'To Do', value: stats.statusDistribution.todo, color: '#9ca3af' },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${Math.round((percent || 0) * 100)}%`}
                        labelLine={false}
                      >
                        {[
                          { name: 'Completed', value: stats.statusDistribution.completed, color: '#22c55e' },
                          { name: 'In Progress', value: stats.statusDistribution.in_progress, color: '#3b82f6' },
                          { name: 'To Do', value: stats.statusDistribution.todo, color: '#9ca3af' },
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [`${value} tasks`, name]}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No task data available
                    </div>
                  )}
                </div>
                
                {/* Legend with percentages */}
                <div className="w-full md:w-1/3 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full bg-green-500"></span>
                      <span className="font-medium">Completed</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{Math.round((stats.statusDistribution.completed / stats.totalTasks) * 100)}%</div>
                      <div className="text-xs text-muted-foreground">{stats.statusDistribution.completed} tasks</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                      <span className="font-medium">In Progress</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{Math.round((stats.statusDistribution.in_progress / stats.totalTasks) * 100)}%</div>
                      <div className="text-xs text-muted-foreground">{stats.statusDistribution.in_progress} tasks</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full bg-gray-400"></span>
                      <span className="font-medium">To Do</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-600">{Math.round((stats.statusDistribution.todo / stats.totalTasks) * 100)}%</div>
                      <div className="text-xs text-muted-foreground">{stats.statusDistribution.todo} tasks</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No task data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.teamMembers}</div>
            <p className="text-sm text-muted-foreground">Active collaborators</p>
          </CardContent>
        </Card>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingDeadlines.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></span>
                      <span className="text-sm font-medium">{task.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(task.endDate)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming deadlines
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.activityLogs && project.activityLogs.length > 0 ? (
              <div className="space-y-3">
                {project.activityLogs.slice(0, 5).map((log: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.user?.fullName || 'System'} • {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
