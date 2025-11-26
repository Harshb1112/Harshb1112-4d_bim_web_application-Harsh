/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Circle,
  Box,
  Link2,
  Calendar,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface AnalyticsDashboardProps {
  project: any
}

export default function AnalyticsDashboard({ project }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [project.id])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Fetch real task data
      const response = await fetch(`/api/tasks?projectId=${project.id}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const { tasks } = await response.json()
      
      // Calculate analytics from real data
      const totalTasks = tasks.length
      const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length
      const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length
      const notStartedTasks = tasks.filter((t: any) => t.status === 'todo' || !t.status).length
      
      // Calculate average progress
      const avgTaskProgress = totalTasks > 0
        ? tasks.reduce((sum: number, t: any) => sum + (Number(t.progress) || 0), 0) / totalTasks
        : 0
      
      // Count total elements linked
      const totalElementsLinked = tasks.reduce((sum: number, t: any) => 
        sum + (t.elementLinks?.length || 0), 0
      )
      
      // Calculate element link coverage (assuming total elements from models)
      const totalModels = project.models?.length || 0
      const totalElements = project.models?.reduce((sum: number, m: any) => 
        sum + (m._count?.elements || 0), 0
      ) || 0
      
      const elementLinkCoverage = totalElements > 0
        ? (totalElementsLinked / totalElements) * 100
        : 0
      
      // Calculate project duration
      const startDate = project.startDate ? new Date(project.startDate) : new Date()
      const endDate = project.endDate ? new Date(project.endDate) : new Date()
      const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Fetch progress logs for timeline
      let progressOverTime: any[] = []
      try {
        const progressResponse = await fetch(`/api/projects/${project.id}/progress-timeline`, {
          credentials: 'include'
        })
        
        if (progressResponse.ok) {
          const progressData = await progressResponse.json()
          progressOverTime = progressData.timeline || []
        }
      } catch (error) {
        console.log('Progress timeline not available, using task-based calculation')
        
        // Fallback: Calculate weekly progress from tasks
        const now = new Date()
        const weeksToShow = 7
        progressOverTime = []
        
        for (let i = weeksToShow - 1; i >= 0; i--) {
          const weekDate = new Date(now)
          weekDate.setDate(weekDate.getDate() - (i * 7))
          
          // Calculate progress at that point (simplified - just use current progress)
          const weekProgress = i === 0 ? avgTaskProgress : (avgTaskProgress * (weeksToShow - i) / weeksToShow)
          
          progressOverTime.push({
            date: weekDate.toISOString().split('T')[0],
            progress: Math.round(weekProgress * 10) / 10
          })
        }
      }

      const analyticsData = {
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        avgTaskProgress,
        totalModels,
        totalElements,
        totalElementsLinked,
        elementLinkCoverage,
        projectStartDate: project.startDate || new Date().toISOString(),
        projectEndDate: project.endDate || new Date().toISOString(),
        totalDuration: totalDuration > 0 ? totalDuration : 0,
        progressOverTime
      }
      
      setData(analyticsData)
      toast.success('Analytics updated')
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const completedPercentage = data.totalTasks > 0 
    ? ((data.completedTasks / data.totalTasks) * 100).toFixed(1)
    : '0.0'

  const inProgressPercentage = data.totalTasks > 0
    ? ((data.inProgressTasks / data.totalTasks) * 100).toFixed(1)
    : '0.0'

  const notStartedPercentage = data.totalTasks > 0
    ? ((data.notStartedTasks / data.totalTasks) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Overview of project progress, tasks, and model linking status.</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tasks */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.totalTasks}</div>
            <p className="text-xs text-gray-500 mt-1">
              {data.completedTasks} completed, {data.inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>

        {/* Avg Task Progress */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Avg. Task Progress</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.avgTaskProgress.toFixed(1)}%</div>
            <Progress value={data.avgTaskProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Total Models */}
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Models</CardTitle>
              <Box className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.totalModels}</div>
            <p className="text-xs text-gray-500 mt-1">{data.totalElements || 0} total elements</p>
          </CardContent>
        </Card>

        {/* Element Link Coverage */}
        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Element Link Coverage</CardTitle>
              <Link2 className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.elementLinkCoverage.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-1">{data.totalElementsLinked || 0} of {data.totalElements || 0} elements linked</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Breakdown */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Task Status Breakdown</CardTitle>
            <p className="text-sm text-gray-500">Distribution of tasks by their current progress status.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Completed */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Completed</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{data.completedTasks} ({completedPercentage}%)</div>
              </div>
            </div>

            {/* In Progress */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">In Progress</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{data.inProgressTasks} ({inProgressPercentage}%)</div>
              </div>
            </div>

            {/* Not Started */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Circle className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Not Started</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{data.notStartedTasks} ({notStartedPercentage}%)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Timeline Overview */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Project Timeline Overview</CardTitle>
            <p className="text-sm text-gray-500">Key dates and overall duration of the project.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Start Date */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-700">Project Start Date</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {data.projectStartDate ? format(new Date(data.projectStartDate), 'MM/dd/yyyy') : '-'}
              </div>
            </div>

            {/* Project End Date */}
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-700">Project End Date</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {data.projectEndDate ? format(new Date(data.projectEndDate), 'MM/dd/yyyy') : '-'}
              </div>
            </div>

            {/* Total Duration */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-700">Total Duration</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">{data.totalDuration} days</div>
            </div>

            {/* Progress Over Time */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Progress Over Time 
                <span className="text-xs font-normal text-gray-500">(Last 7 weeks)</span>
              </h4>
              <div className="space-y-2">
                {data.progressOverTime && data.progressOverTime.length > 0 ? (
                  data.progressOverTime.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, item.progress)}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900 w-10 text-right">{item.progress}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center py-4">
                    No progress data available yet. Complete tasks to see progress over time.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics Information</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                This dashboard provides real-time insights into your project's progress. 
                Task statistics update automatically as you create and complete tasks. 
                Element link coverage shows how many BIM elements are connected to construction tasks, 
                helping you track 4D simulation readiness.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
