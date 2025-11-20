/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress' // Assuming you have a Progress component
import {
  BarChart,
  CheckCircle2,
  Hourglass,
  XCircle,
  Link2,
  Box,
  CalendarDays,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@radix-ui/react-label'

interface AnalyticsData {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  notStartedTasks: number
  averageTaskProgress: number
  totalModels: number
  totalElements: number
  totalLinks: number
  linkedElementsCount: number
  projectDurationDays: number
  progressOverTime: Array<{ date: string; progress: number }>
}

interface AnalyticsDashboardProps {
  project: any
}

export default function AnalyticsDashboard({ project }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (project?.id) {
      fetchAnalyticsData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0]
      const response = await fetch(`/api/projects/${project.id}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      } else {
        toast.error('Failed to load analytics data.')
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error)
      toast.error('An error occurred while loading analytics data.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">No analytics data available</p>
        <p className="text-sm">Ensure models are uploaded and tasks are created and linked.</p>
        <Button onClick={fetchAnalyticsData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Loading
        </Button>
      </div>
    )
  }

  const {
    totalTasks,
    completedTasks,
    inProgressTasks,
    notStartedTasks,
    averageTaskProgress,
    totalModels,
    totalElements,
    linkedElementsCount,
    projectDurationDays,
    progressOverTime,
  } = analyticsData

  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const elementLinkCoverage = totalElements > 0 ? (linkedElementsCount / totalElements) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Analytics Dashboard</h2>
          <p className="text-sm text-gray-500">Overview of project progress, tasks, and model linking status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalyticsData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <BarChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} completed, {inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Task Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageTaskProgress.toFixed(1)}%</div>
            <Progress value={averageTaskProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Box className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalModels}</div>
            <p className="text-xs text-muted-foreground">
              {totalElements} total elements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Element Link Coverage</CardTitle>
            <Link2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{elementLinkCoverage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {linkedElementsCount} of {totalElements} elements linked
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Breakdown</CardTitle>
            <CardDescription>Distribution of tasks by their current progress status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Label>Completed</Label>
              </div>
              <span className="font-medium">{completedTasks} ({taskCompletionRate.toFixed(1)}%)</span>
            </div>
            <Progress value={taskCompletionRate} className="h-2" indicatorColor="bg-green-500" />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Hourglass className="h-4 w-4 text-blue-500" />
                <Label>In Progress</Label>
              </div>
              <span className="font-medium">{inProgressTasks} ({(totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0).toFixed(1)}%)</span>
            </div>
            <Progress value={totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0} className="h-2" indicatorColor="bg-blue-500" />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-gray-500" />
                <Label>Not Started</Label>
              </div>
              <span className="font-medium">{notStartedTasks} ({(totalTasks > 0 ? (notStartedTasks / totalTasks) * 100 : 0).toFixed(1)}%)</span>
            </div>
            <Progress value={totalTasks > 0 ? (notStartedTasks / totalTasks) * 100 : 0} className="h-2" indicatorColor="bg-gray-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Timeline Overview</CardTitle>
            <CardDescription>Key dates and overall duration of the project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Project Start Date</Label>
              <span className="font-medium">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label>Project End Date</Label>
              <span className="font-medium">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label>Total Duration</Label>
              <span className="font-medium">{projectDurationDays} days</span>
            </div>
            {/* Simple representation of progress over time - could be a chart */}
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2">Progress Over Time (Conceptual)</h3>
              <div className="space-y-1 text-sm text-gray-600 max-h-40 overflow-y-auto">
                {progressOverTime.length > 0 ? (
                  progressOverTime.map((entry, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{entry.date}:</span>
                      <span>{entry.progress}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No historical progress data.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}