"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, Database, Zap, FolderKanban, Bot, DollarSign, TrendingUp, AlertCircle, CheckCircle2, XCircle, RefreshCw, Download, Bell, BarChart3, Clock, Users, Wrench, PieChart, LineChart, Target, Flame, Award, AlertTriangle, Calendar, TrendingDown, Filter, Globe } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProjectHealth {
  id: number
  name: string
  overallScore: number
  scheduleScore: number
  costScore: number
  resourceScore: number
  spi: number
  cpi: number
  tasksTotal: number
  tasksCompleted: number
  tasksOverdue: number
  tasksInProgress?: number
  budget?: number
  spent?: number
  startDate?: string
  endDate?: string
  progress?: number
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  api: 'healthy' | 'warning' | 'error'
  aiService: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
}

interface AICredits {
  provider: 'openai' | 'claude'
  hasKey: boolean
  estimatedCredits: string
  lastUsed: string | null
}

export default function HealthPage() {
  const [projects, setProjects] = useState<ProjectHealth[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'healthy',
    api: 'healthy',
    aiService: 'healthy',
    storage: 'healthy'
  })
  const [aiCredits, setAICredits] = useState<AICredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'analytics'>('overview')
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [analytics, setAnalytics] = useState<any>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all')
  const [selectedProjectTasks, setSelectedProjectTasks] = useState<any[]>([])
  const [selectedRegion, setSelectedRegion] = useState<'india' | 'usa' | 'uae' | 'uk' | 'europe'>('india')

  // Real Exchange Rates (as of Dec 2024) - Base: INR
  const EXCHANGE_RATES: Record<string, { rate: number; symbol: string; name: string }> = {
    india: { rate: 1, symbol: '₹', name: 'INR' },
    usa: { rate: 0.0112, symbol: '$', name: 'USD' },
    uae: { rate: 0.0411, symbol: 'AED', name: 'AED' },
    uk: { rate: 0.0089, symbol: '£', name: 'GBP' },
    europe: { rate: 0.0107, symbol: '€', name: 'EUR' },
  }

  // Convert INR to selected currency
  const convertCurrency = (inrAmount: number): number => {
    const rate = EXCHANGE_RATES[selectedRegion].rate
    return Math.round(inrAmount * rate * 100) / 100
  }

  useEffect(() => {
    fetchHealthData()
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchHealthData()
      }, 30000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, viewMode, selectedProjectId])

  const fetchProjectTasks = async (projectId: number) => {
    try {
      const response = await fetch(`/api/tasks/all?projectId=${projectId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSelectedProjectTasks(data.tasks || [])
        console.log(`✅ Fetched ${data.tasks?.length || 0} tasks for project ${projectId}`)
      }
    } catch (error) {
      console.error('Failed to fetch project tasks:', error)
    }
  }

  // Fetch tasks when project selection changes
  useEffect(() => {
    if (viewMode === 'single' && selectedProjectId) {
      fetchProjectTasks(selectedProjectId)
    } else {
      setSelectedProjectTasks([])
    }
  }, [selectedProjectId, viewMode])

  const fetchHealthData = async () => {
    try {
      setRefreshing(true)
      
      // Fetch all projects health - REAL DATA
      const projectsRes = await fetch('/api/health/projects')
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects || [])
      } else {
        console.error('Failed to fetch projects health')
      }

      // Fetch system health - REAL STATUS
      const systemRes = await fetch('/api/health/system')
      if (systemRes.ok) {
        const data = await systemRes.json()
        setSystemHealth(data)
      } else {
        console.error('Failed to fetch system health')
      }

      // Fetch AI credits info - REAL API STATUS
      const aiRes = await fetch('/api/health/ai-credits', { credentials: 'include' })
      if (aiRes.ok) {
        const data = await aiRes.json()
        console.log('🤖 AI Credits Response:', data)
        setAICredits(data)
      } else {
        console.error('Failed to fetch AI credits:', aiRes.status)
        // Set default state if API fails
        setAICredits({
          provider: 'openai',
          hasKey: false,
          estimatedCredits: 'Unable to fetch',
          lastUsed: null
        })
      }

      // Fetch REAL analytics data
      const analyticsRes = await fetch('/api/health/analytics')
      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data.analytics)
        console.log('✅ REAL analytics data loaded:', data.analytics)
      } else {
        console.error('Failed to fetch analytics')
      }

      // Fetch tasks for selected project if in single mode
      if (viewMode === 'single' && selectedProjectId) {
        await fetchProjectTasks(selectedProjectId)
      }
      
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const exportHealthReport = () => {
    const projectsToExport = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects;

    const report = {
      // Report Metadata
      reportInfo: {
        title: 'System Health Report',
        generatedAt: new Date().toISOString(),
        generatedBy: 'BIM 4D Scheduler',
        reportType: viewMode === 'all' ? 'All Projects' : 'Single Project',
        selectedProject: viewMode === 'single' && selectedProjectId 
          ? getSelectedProject()?.name 
          : null
      },

      // Executive Summary
      executiveSummary: {
        totalProjects: projectsToExport.length,
        averageHealth: getAverageProjectHealth(),
        criticalProjects: getCriticalProjects().length,
        systemStatus: getOverallSystemHealth(),
        totalTasks: getTotalTasksStats().total,
        completedTasks: getTotalTasksStats().completed,
        overdueTasks: getTotalTasksStats().overdue,
        completionRate: getTotalTasksStats().total > 0 
          ? Math.round((getTotalTasksStats().completed / getTotalTasksStats().total) * 100)
          : 0
      },

      // System Health Details
      systemHealth: {
        database: {
          status: systemHealth.database,
          description: systemHealth.database === 'healthy' ? 'Database is operational' : 'Database issues detected'
        },
        api: {
          status: systemHealth.api,
          description: systemHealth.api === 'healthy' ? 'API is operational' : 'API issues detected'
        },
        aiService: {
          status: systemHealth.aiService,
          description: systemHealth.aiService === 'healthy' ? 'AI service is configured' : 'AI service needs attention'
        },
        storage: {
          status: systemHealth.storage,
          description: systemHealth.storage === 'healthy' ? 'Storage is operational' : 'Storage issues detected'
        }
      },

      // AI Credits Information
      aiCredits: aiCredits ? {
        provider: aiCredits.provider,
        hasKey: aiCredits.hasKey,
        keyPreview: aiCredits.keyPreview,
        estimatedCredits: aiCredits.estimatedCredits,
        lastUsed: aiCredits.lastUsed,
        status: aiCredits.status,
        billingUrl: aiCredits.billingUrl
      } : null,

      // Detailed Project Information
      projects: projectsToExport.map(p => ({
        id: p.id,
        name: p.name,
        
        // Health Scores
        healthScores: {
          overall: p.overallScore,
          schedule: p.scheduleScore,
          cost: p.costScore === -1 ? 'N/A - No cost data' : p.costScore,
          resources: p.resourceScore === -1 ? 'N/A - No resources' : p.resourceScore
        },

        // Performance Indicators
        performanceIndicators: {
          spi: p.spi,
          spiStatus: p.spi >= 1 ? 'Ahead of Schedule' : p.spi >= 0.95 ? 'On Schedule' : 'Behind Schedule',
          cpi: p.cpi,
          cpiStatus: p.cpi >= 1 ? 'Under Budget' : p.cpi >= 0.95 ? 'On Budget' : 'Over Budget'
        },

        // Task Statistics
        tasks: {
          total: p.tasksTotal,
          completed: p.tasksCompleted,
          inProgress: p.tasksInProgress || 0,
          pending: p.tasksTotal - p.tasksCompleted - (p.tasksInProgress || 0),
          overdue: p.tasksOverdue,
          completionRate: p.tasksTotal > 0 
            ? Math.round((p.tasksCompleted / p.tasksTotal) * 100) 
            : 0
        },

        // Budget Information
        budget: {
          estimated: p.totalBudget || p.budget || 0,
          spent: p.spent || 0,
          remaining: (p.totalBudget || p.budget || 0) - (p.spent || 0),
          percentSpent: (p.totalBudget || p.budget) > 0 
            ? Math.round((p.spent / (p.totalBudget || p.budget)) * 100) 
            : 0
        },

        // Timeline
        timeline: {
          startDate: p.startDate,
          endDate: p.endDate,
          progress: p.progress || 0,
          daysRemaining: p.endDate 
            ? Math.ceil((new Date(p.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : null
        },

        // Status
        status: {
          healthRating: p.overallScore >= 80 ? 'Excellent' : 
                       p.overallScore >= 60 ? 'Good' : 
                       p.overallScore >= 40 ? 'Fair' : 'Poor',
          needsAttention: p.overallScore < 40 || p.tasksOverdue > 0,
          criticalIssues: p.tasksOverdue > 0 ? [`${p.tasksOverdue} overdue tasks`] : []
        }
      })),

      // Analytics Summary (if available)
      analytics: analytics ? {
        taskDistribution: {
          total: analytics.tasks?.total || 0,
          completed: analytics.tasks?.completed || 0,
          inProgress: analytics.tasks?.inProgress || 0,
          pending: analytics.tasks?.pending || 0,
          overdue: analytics.tasks?.overdue || 0
        },
        budgetSummary: {
          totalEstimated: analytics.budget?.totalEstimated || 0,
          totalActual: analytics.budget?.totalActual || 0,
          variance: analytics.budget?.variance || 0
        },
        teamStatistics: {
          totalMembers: analytics.team?.totalMembers || 0,
          totalTeams: analytics.team?.totalTeams || 0,
          avgTeamSize: analytics.team?.avgTeamSize || 0
        },
        performanceMetrics: {
          completionRate: analytics.performance?.completionRate || 0,
          onTimeRate: analytics.performance?.onTimeRate || 0,
          budgetEfficiency: analytics.performance?.budgetEfficiency || 0
        }
      } : null,

      // Project Distribution
      projectDistribution: {
        excellent: getProjectsByPhase().excellent,
        good: getProjectsByPhase().good,
        fair: getProjectsByPhase().fair,
        poor: getProjectsByPhase().poor
      },

      // Schedule Performance
      schedulePerformance: {
        averageSPI: getSchedulePerformance().avgSPI,
        onSchedule: getSchedulePerformance().onSchedule,
        ahead: getSchedulePerformance().ahead,
        behind: getSchedulePerformance().behind
      },

      // Cost Performance
      costPerformance: {
        averageCPI: getCostPerformance().avgCPI,
        onBudget: getCostPerformance().onBudget,
        underBudget: getCostPerformance().underBudget,
        overBudget: getCostPerformance().overBudget
      },

      // Upcoming Deadlines
      upcomingDeadlines: getUpcomingDeadlines().map(d => ({
        projectId: d.id,
        projectName: d.name,
        endDate: d.endDate,
        daysRemaining: d.daysRemaining,
        urgency: d.daysRemaining <= 7 ? 'Critical' : 
                d.daysRemaining <= 14 ? 'High' : 
                d.daysRemaining <= 21 ? 'Medium' : 'Low'
      })),

      // Top Performing Projects
      topPerformers: getTopPerformingProjects().map((p, index) => ({
        rank: index + 1,
        projectId: p.id,
        projectName: p.name,
        healthScore: p.overallScore
      })),

      // Critical Projects
      criticalProjects: getCriticalProjects().map(p => ({
        projectId: p.id,
        projectName: p.name,
        healthScore: p.overallScore,
        issues: [
          p.overallScore < 40 ? `Low health score: ${p.overallScore}` : null,
          p.tasksOverdue > 0 ? `${p.tasksOverdue} overdue tasks` : null
        ].filter(Boolean)
      })),

      // Recommendations
      recommendations: [
        getCriticalProjects().length > 0 
          ? `⚠️ ${getCriticalProjects().length} project(s) need immediate attention`
          : '✅ All projects are performing well',
        getTotalTasksStats().overdue > 0
          ? `⚠️ ${getTotalTasksStats().overdue} tasks are overdue - review and reschedule`
          : '✅ No overdue tasks',
        getSchedulePerformance().behind > 0
          ? `⚠️ ${getSchedulePerformance().behind} project(s) behind schedule - review timeline`
          : '✅ All projects on or ahead of schedule',
        getCostPerformance().overBudget > 0
          ? `⚠️ ${getCostPerformance().overBudget} project(s) over budget - review costs`
          : '✅ All projects within budget'
      ]
    }
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-report-${viewMode}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    console.log('📊 Exported comprehensive health report:', report)
  }

  const getOverallSystemHealth = () => {
    const statuses = Object.values(systemHealth)
    if (statuses.every(s => s === 'healthy')) return 'healthy'
    if (statuses.some(s => s === 'error')) return 'error'
    return 'warning'
  }

  const getAverageProjectHealth = () => {
    const projectsToCalculate = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects
    
    if (projectsToCalculate.length === 0) return 0
    return Math.round(projectsToCalculate.reduce((sum, p) => sum + p.overallScore, 0) / projectsToCalculate.length)
  }

  const getCriticalProjects = () => {
    const projectsToCheck = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects
    
    return projectsToCheck.filter(p => p.overallScore < 40 || p.tasksOverdue > 0)
  }

  const getSelectedProject = () => {
    if (!selectedProjectId) return null
    return projects.find(p => p.id === selectedProjectId)
  }

  const getProjectsToDisplay = () => {
    if (viewMode === 'single' && selectedProjectId) {
      return projects.filter(p => p.id === selectedProjectId)
    }
    return projects
  }

  const getTopPerformingProjects = () => {
    return projects.filter(p => p.overallScore >= 80).sort((a, b) => b.overallScore - a.overallScore).slice(0, 5)
  }

  const getProjectsByPhase = () => {
    const projectsToAnalyze = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects;
      
    const total = projectsToAnalyze.length
    const excellent = projectsToAnalyze.filter(p => p.overallScore >= 80).length
    const good = projectsToAnalyze.filter(p => p.overallScore >= 60 && p.overallScore < 80).length
    const fair = projectsToAnalyze.filter(p => p.overallScore >= 40 && p.overallScore < 60).length
    const poor = projectsToAnalyze.filter(p => p.overallScore < 40).length
    
    return { total, excellent, good, fair, poor }
  }

  const getTotalTasksStats = () => {
    const projectsToAnalyze = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects;

    if (analytics?.tasks && viewMode === 'all') {
      return analytics.tasks
    }
    
    // Calculate from filtered projects
    const total = projectsToAnalyze.reduce((sum, p) => sum + p.tasksTotal, 0)
    const completed = projectsToAnalyze.reduce((sum, p) => sum + p.tasksCompleted, 0)
    const overdue = projectsToAnalyze.reduce((sum, p) => sum + p.tasksOverdue, 0)
    const inProgress = projectsToAnalyze.reduce((sum, p) => sum + (p.tasksInProgress || 0), 0)
    const pending = total - completed - inProgress
    
    return { total, completed, overdue, inProgress, pending }
  }

  const getBudgetStats = () => {
    const projectsToAnalyze = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects;

    if (analytics?.budget && viewMode === 'all') {
      return {
        totalBudget: analytics.budget.totalEstimated,
        totalSpent: analytics.budget.totalActual,
        remaining: analytics.budget.variance,
        percentSpent: analytics.budget.totalEstimated > 0 
          ? (analytics.budget.totalActual / analytics.budget.totalEstimated) * 100 
          : 0
      }
    }
    
    // Calculate from filtered projects
    const totalBudget = projectsToAnalyze.reduce((sum, p) => sum + (p.totalBudget || p.budget || 0), 0)
    const totalSpent = projectsToAnalyze.reduce((sum, p) => sum + (p.spent || 0), 0)
    const remaining = totalBudget - totalSpent
    const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    
    return { totalBudget, totalSpent, remaining, percentSpent }
  }

  const getSchedulePerformance = () => {
    const projectsToAnalyze = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects;
      
    const avgSPI = projectsToAnalyze.length > 0 
      ? projectsToAnalyze.reduce((sum, p) => sum + p.spi, 0) / projectsToAnalyze.length 
      : 0
    const onSchedule = projectsToAnalyze.filter(p => p.spi >= 0.95 && p.spi <= 1.05).length
    const ahead = projectsToAnalyze.filter(p => p.spi > 1.05).length
    const behind = projectsToAnalyze.filter(p => p.spi < 0.95).length
    
    return { avgSPI, onSchedule, ahead, behind }
  }

  const getCostPerformance = () => {
    const projectsToAnalyze = viewMode === 'single' && selectedProjectId
      ? projects.filter(p => p.id === selectedProjectId)
      : projects;
      
    const avgCPI = projectsToAnalyze.length > 0 
      ? projectsToAnalyze.reduce((sum, p) => sum + p.cpi, 0) / projectsToAnalyze.length 
      : 0
    const onBudget = projectsToAnalyze.filter(p => p.cpi >= 0.95 && p.cpi <= 1.05).length
    const underBudget = projectsToAnalyze.filter(p => p.cpi > 1.05).length
    const overBudget = projectsToAnalyze.filter(p => p.cpi < 0.95).length
    
    return { avgCPI, onBudget, underBudget, overBudget }
  }

  const getHealthTrend = () => {
    // Simulate trend data (in real app, fetch from API)
    const currentAvg = getAverageProjectHealth()
    const trend = currentAvg >= 70 ? 'improving' : currentAvg >= 50 ? 'stable' : 'declining'
    
    return { current: currentAvg, trend }
  }

  const getUpcomingDeadlines = () => {
    if (analytics?.upcomingDeadlines) {
      return analytics.upcomingDeadlines.map((d: any) => ({
        id: d.projectId,
        name: d.projectName,
        endDate: d.endDate,
        daysRemaining: d.daysRemaining
      }))
    }
    // Fallback
    return projects
      .filter(p => p.endDate)
      .map(p => ({
        id: p.id,
        name: p.name,
        endDate: p.endDate!,
        daysRemaining: Math.ceil((new Date(p.endDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }))
      .filter(p => p.daysRemaining >= 0 && p.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5)
  }

  const formatCurrency = (amount: number) => {
    const convertedAmount = convertCurrency(amount)
    const { symbol } = EXCHANGE_RATES[selectedRegion]
    
    if (selectedRegion === 'india') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(convertedAmount)
    } else if (selectedRegion === 'usa') {
      return `${symbol}${convertedAmount.toLocaleString('en-US')}`
    } else if (selectedRegion === 'uae') {
      return `${symbol} ${convertedAmount.toLocaleString()}`
    } else if (selectedRegion === 'uk') {
      return `${symbol}${convertedAmount.toLocaleString('en-GB')}`
    } else {
      return `${symbol}${convertedAmount.toLocaleString('de-DE')}`
    }
  }

  const SimpleBarChart = ({ data, label }: { data: { label: string; value: number; color: string }[]; label: string }) => {
    const maxValue = Math.max(...data.map(d => d.value))
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-semibold">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${item.color}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const SimplePieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0)
    
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{item.value}</span>
              <span className="text-xs text-gray-500 ml-1">
                ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getHealthBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent</Badge>
    if (score >= 60) return <Badge className="bg-yellow-500">Good</Badge>
    if (score >= 40) return <Badge className="bg-orange-500">Fair</Badge>
    return <Badge className="bg-red-500">Poor</Badge>
  }

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    if (status === 'healthy') return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (status === 'warning') return <AlertCircle className="h-5 w-5 text-yellow-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            System Health Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {viewMode === 'all' 
              ? `Monitor all ${projects.length} projects, system status, and AI credits in one place`
              : `Detailed health view for ${getSelectedProject()?.name || 'selected project'}`
            }
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Region Selector */}
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedRegion} onValueChange={(value: any) => setSelectedRegion(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="india">🇮🇳 India (₹)</SelectItem>
                <SelectItem value="usa">🇺🇸 USA ($)</SelectItem>
                <SelectItem value="uae">🇦🇪 UAE (AED)</SelectItem>
                <SelectItem value="uk">🇬🇧 UK (£)</SelectItem>
                <SelectItem value="europe">🇪🇺 Europe (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-500' : ''}
          >
            <Bell className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportHealthReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={fetchHealthData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-4 w-4 text-blue-600" />
            View Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('all')
                  setSelectedProjectId(null)
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                All Projects ({projects.length})
              </Button>
              <Button
                variant={viewMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('single')
                  if (projects.length > 0 && !selectedProjectId) {
                    setSelectedProjectId(projects[0].id)
                  }
                }}
              >
                <Target className="h-4 w-4 mr-2" />
                Single Project
              </Button>
            </div>

            {viewMode === 'single' && (
              <div className="flex-1">
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  className="w-full max-w-md px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - Health: {project.overallScore}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {viewMode === 'single' && selectedProjectId && getSelectedProject() && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{getSelectedProject()!.name}</h3>
                  <p className="text-sm text-gray-600">
                    {getSelectedProject()!.tasksCompleted}/{getSelectedProject()!.tasksTotal} tasks completed
                    {getSelectedProject()!.tasksOverdue > 0 && (
                      <span className="text-red-600 ml-2">• {getSelectedProject()!.tasksOverdue} overdue</span>
                    )}
                  </p>
                </div>
                {getHealthBadge(getSelectedProject()!.overallScore)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold capitalize">{getOverallSystemHealth()}</p>
                <p className="text-sm text-gray-500 mt-1">All services</p>
              </div>
              {getStatusIcon(getOverallSystemHealth())}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {viewMode === 'all' ? 'Average Project Health' : 'Project Health'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${getHealthColor(getAverageProjectHealth())}`}>
                  {getAverageProjectHealth()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {viewMode === 'all' ? `${projects.length} projects` : getSelectedProject()?.name}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={getAverageProjectHealth()} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Critical Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${getCriticalProjects().length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {getCriticalProjects().length}
                </p>
                <p className="text-sm text-gray-500 mt-1">Need attention</p>
              </div>
              <AlertCircle className={`h-8 w-8 ${getCriticalProjects().length > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Projects Alert */}
      {getCriticalProjects().length > 0 && (
        <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <span className="font-semibold text-red-900 dark:text-red-100">
              {getCriticalProjects().length} project(s) need immediate attention!
            </span>
            <div className="mt-2 space-y-1">
              {getCriticalProjects().map(p => (
                <div key={p.id} className="text-sm text-red-800 dark:text-red-200">
                  • {p.name}: {p.tasksOverdue > 0 ? `${p.tasksOverdue} overdue tasks` : `Health score: ${p.overallScore}`}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </span>
              {getStatusIcon(systemHealth.database)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{systemHealth.database}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                API
              </span>
              {getStatusIcon(systemHealth.api)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{systemHealth.api}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Service
              </span>
              {getStatusIcon(systemHealth.aiService)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{systemHealth.aiService}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Storage
              </span>
              {getStatusIcon(systemHealth.storage)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{systemHealth.storage}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Credits Info */}
      {aiCredits && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  AI Credits Status
                  {aiCredits.hasKey && (
                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
                      Active
                    </Badge>
                  )}
                  {!aiCredits.hasKey && aiCredits.estimatedCredits === 'Not configured' && (
                    <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-300">
                      Not Configured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Monitor your {aiCredits.provider === 'claude' ? 'Claude' : 'OpenAI'} API usage
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchHealthData}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Provider</p>
                <p className="text-xl font-bold capitalize">{aiCredits.provider}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">API Key Status</p>
                <p className="text-xl font-bold">
                  {aiCredits.hasKey ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-5 w-5" />
                      Configured
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="h-5 w-5" />
                      Not Set
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <p className="text-xl font-bold">{aiCredits.estimatedCredits}</p>
              </div>
            </div>
            {aiCredits.lastUsed && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last used: {new Date(aiCredits.lastUsed).toLocaleString()}
              </p>
            )}
            {!aiCredits.hasKey && (
              <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  AI features are not configured. Go to{' '}
                  <a href="/dashboard/settings" className="text-blue-600 hover:underline font-semibold">
                    Settings → AI Configuration
                  </a>
                  {' '}to add your API key.
                </AlertDescription>
              </Alert>
            )}
            {aiCredits.hasKey && (
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <a
                    href={aiCredits.provider === 'claude' 
                      ? 'https://console.anthropic.com/settings/billing' 
                      : 'https://platform.openai.com/account/billing'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Check actual credits on {aiCredits.provider === 'claude' ? 'Anthropic Console' : 'OpenAI Platform'} →
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Projects Health */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analytics</TabsTrigger>
          <TabsTrigger value="analytics">Performance Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Projects Health Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-600" />
                {viewMode === 'all' ? 'All Projects Health' : `${getSelectedProject()?.name} - Detailed Health`}
              </CardTitle>
              <CardDescription>
                {viewMode === 'all' 
                  ? `Overview of health metrics for all ${projects.length} projects`
                  : 'Detailed health metrics for selected project'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getProjectsToDisplay().length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {viewMode === 'single' ? 'Please select a project' : 'No projects found'}
                </p>
              ) : (
                <div className="space-y-4">
                  {getProjectsToDisplay().map((project) => (
                    <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {project.tasksCompleted}/{project.tasksTotal} tasks completed
                            {project.tasksOverdue > 0 && (
                              <span className="text-red-600 ml-2">• {project.tasksOverdue} overdue</span>
                            )}
                          </p>
                        </div>
                        {getHealthBadge(project.overallScore)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Overall</p>
                          <p className={`text-2xl font-bold ${getHealthColor(project.overallScore)}`}>
                            {project.overallScore}
                          </p>
                          <Progress value={project.overallScore} className="mt-1" />
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Schedule</p>
                          <p className={`text-2xl font-bold ${getHealthColor(project.scheduleScore)}`}>
                            {project.scheduleScore}
                          </p>
                          <Progress value={project.scheduleScore} className="mt-1" />
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Cost</p>
                          {project.costScore === -1 ? (
                            <>
                              <p className="text-xl font-bold text-gray-400">N/A</p>
                              <p className="text-xs text-gray-500 mt-1">No cost data</p>
                            </>
                          ) : (
                            <>
                              <p className={`text-2xl font-bold ${getHealthColor(project.costScore)}`}>
                                {project.costScore}
                              </p>
                              <Progress value={project.costScore} className="mt-1" />
                            </>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Resources</p>
                          {project.resourceScore === -1 ? (
                            <>
                              <p className="text-xl font-bold text-gray-400">N/A</p>
                              <p className="text-xs text-gray-500 mt-1">No resources</p>
                            </>
                          ) : (
                            <>
                              <p className={`text-2xl font-bold ${getHealthColor(project.resourceScore)}`}>
                                {project.resourceScore}
                              </p>
                              <Progress value={project.resourceScore} className="mt-1" />
                            </>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">SPI</p>
                          <p className={`text-xl font-bold ${project.spi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                            {project.spi.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {project.spi >= 1 ? 'Ahead' : 'Behind'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">CPI</p>
                          <p className={`text-xl font-bold ${project.cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                            {project.cpi.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {project.cpi >= 1 ? 'Under budget' : 'Over budget'}
                          </p>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/project/${project.id}`}>
                            <FolderKanban className="h-3 w-3 mr-1" />
                            View Project
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/project/${project.id}/health`}>
                            <Activity className="h-3 w-3 mr-1" />
                            Detailed Health
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Analytics Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4 text-blue-600" />
                  Task Distribution
                  {viewMode === 'single' && selectedProjectId && (
                    <Badge variant="outline" className="ml-2">
                      {getSelectedProject()?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimplePieChart
                  data={[
                    { label: 'Completed', value: getTotalTasksStats().completed, color: 'bg-green-500' },
                    { label: 'In Progress', value: getTotalTasksStats().inProgress, color: 'bg-blue-500' },
                    { label: 'Pending', value: getTotalTasksStats().pending, color: 'bg-gray-400' },
                    { label: 'Overdue', value: getTotalTasksStats().overdue, color: 'bg-red-500' }
                  ]}
                />
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Total Tasks: <span className="font-bold">{getTotalTasksStats().total}</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Project Health Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  {viewMode === 'all' ? 'Project Health Distribution' : 'Project Health Status'}
                  {viewMode === 'single' && selectedProjectId && (
                    <Badge variant="outline" className="ml-2">
                      {getSelectedProject()?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  label="Projects"
                  data={[
                    { label: 'Excellent (80+)', value: getProjectsByPhase().excellent, color: 'bg-green-500' },
                    { label: 'Good (60-79)', value: getProjectsByPhase().good, color: 'bg-blue-500' },
                    { label: 'Fair (40-59)', value: getProjectsByPhase().fair, color: 'bg-yellow-500' },
                    { label: 'Poor (<40)', value: getProjectsByPhase().poor, color: 'bg-red-500' }
                  ]}
                />
              </CardContent>
            </Card>

            {/* Schedule Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Schedule Performance
                  {viewMode === 'single' && selectedProjectId && (
                    <Badge variant="outline" className="ml-2">
                      {getSelectedProject()?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Average SPI</p>
                    <p className={`text-3xl font-bold ${getSchedulePerformance().avgSPI >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {getSchedulePerformance().avgSPI.toFixed(2)}
                    </p>
                  </div>
                  <SimplePieChart
                    data={[
                      { label: 'On Schedule', value: getSchedulePerformance().onSchedule, color: 'bg-green-500' },
                      { label: 'Ahead', value: getSchedulePerformance().ahead, color: 'bg-blue-500' },
                      { label: 'Behind', value: getSchedulePerformance().behind, color: 'bg-red-500' }
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cost Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Cost Performance
                  {viewMode === 'single' && selectedProjectId && (
                    <Badge variant="outline" className="ml-2">
                      {getSelectedProject()?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Average CPI</p>
                    <p className={`text-3xl font-bold ${getCostPerformance().avgCPI >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {getCostPerformance().avgCPI.toFixed(2)}
                    </p>
                  </div>
                  <SimplePieChart
                    data={[
                      { label: 'On Budget', value: getCostPerformance().onBudget, color: 'bg-green-500' },
                      { label: 'Under Budget', value: getCostPerformance().underBudget, color: 'bg-blue-500' },
                      { label: 'Over Budget', value: getCostPerformance().overBudget, color: 'bg-red-500' }
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Budget Overview */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Budget Overview
                  {viewMode === 'single' && selectedProjectId && (
                    <Badge variant="outline" className="ml-2">
                      {getSelectedProject()?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(getBudgetStats().totalBudget)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatCurrency(getBudgetStats().totalSpent)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Remaining</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(getBudgetStats().remaining)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Spent %</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {getBudgetStats().percentSpent.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <Progress value={getBudgetStats().percentSpent} className="mt-4" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Top Performing - Projects or Tasks based on mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-yellow-600" />
                  {viewMode === 'all' ? 'Top Performing Projects' : 'Top Performing Tasks'}
                  {viewMode === 'single' && selectedProjectId && (
                    <Badge variant="outline" className="ml-2">
                      {getSelectedProject()?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === 'all' ? (
                  // Show Top Projects
                  getTopPerformingProjects().length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No projects with 80+ score</p>
                  ) : (
                    <div className="space-y-3">
                      {getTopPerformingProjects().map((project, index) => (
                        <div key={project.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-600">#{index + 1}</span>
                            <span className="text-sm font-medium">{project.name}</span>
                          </div>
                          <Badge className="bg-green-500">{project.overallScore}</Badge>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Show Top Tasks for selected project with actual task names
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {selectedProjectTasks.length > 0 ? (
                      <>
                        {/* Completed Tasks */}
                        {selectedProjectTasks.filter(t => t.status === 'completed').length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2 sticky top-0 bg-white py-1">
                              ✅ Completed ({selectedProjectTasks.filter(t => t.status === 'completed').length})
                            </p>
                            {selectedProjectTasks
                              .filter(t => t.status === 'completed')
                              .map((task) => (
                                <div key={task.id} className="flex items-center gap-2 p-2 bg-green-50 rounded mb-1 hover:bg-green-100 transition-colors">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 flex-1">{task.name}</span>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* In Progress Tasks */}
                        {selectedProjectTasks.filter(t => t.status === 'in_progress').length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2 sticky top-0 bg-white py-1">
                              🔵 In Progress ({selectedProjectTasks.filter(t => t.status === 'in_progress').length})
                            </p>
                            {selectedProjectTasks
                              .filter(t => t.status === 'in_progress')
                              .map((task) => (
                                <div key={task.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded mb-1 hover:bg-blue-100 transition-colors">
                                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 flex-1">{task.name}</span>
                                  {task.progress > 0 && (
                                    <Badge variant="secondary" className="ml-auto text-xs">
                                      {task.progress}%
                                    </Badge>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Overdue Tasks */}
                        {selectedProjectTasks.filter(t => 
                          t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed'
                        ).length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2 sticky top-0 bg-white py-1">
                              ❌ Overdue ({selectedProjectTasks.filter(t => 
                                t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed'
                              ).length})
                            </p>
                            {selectedProjectTasks
                              .filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed')
                              .map((task) => (
                                <div key={task.id} className="flex items-center gap-2 p-2 bg-red-50 rounded mb-1 hover:bg-red-100 transition-colors">
                                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 flex-1">{task.name}</span>
                                  <Badge variant="destructive" className="ml-auto text-xs">
                                    {Math.ceil((new Date().getTime() - new Date(task.endDate).getTime()) / (1000 * 60 * 60 * 24))}d late
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Pending Tasks */}
                        {selectedProjectTasks.filter(t => t.status === 'todo').length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2 sticky top-0 bg-white py-1">
                              ⚪ Pending ({selectedProjectTasks.filter(t => t.status === 'todo').length})
                            </p>
                            {selectedProjectTasks
                              .filter(t => t.status === 'todo')
                              .map((task) => (
                                <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded mb-1 hover:bg-gray-100 transition-colors">
                                  <div className="h-4 w-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 flex-1">{task.name}</span>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Summary - Sticky at bottom */}
                        <div className="pt-3 border-t mt-3 bg-white sticky bottom-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Tasks</span>
                            <span className="text-lg font-bold">{selectedProjectTasks.length}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-600">Completion Rate</span>
                            <span className="text-lg font-bold text-green-600">
                              {Math.round((selectedProjectTasks.filter(t => t.status === 'completed').length / selectedProjectTasks.length) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(selectedProjectTasks.filter(t => t.status === 'completed').length / selectedProjectTasks.length) * 100} 
                            className="mt-2" 
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Loading tasks...</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-red-600" />
                  {viewMode === 'all' ? 'Upcoming Deadlines (30 days)' : 'Project Timeline'}
                  {viewMode === 'single' && selectedProjectId && (
                    <Badge variant="outline" className="ml-2">
                      {getSelectedProject()?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === 'all' ? (
                  // Show upcoming deadlines for all projects
                  getUpcomingDeadlines().length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No upcoming deadlines</p>
                  ) : (
                    <div className="space-y-3">
                      {getUpcomingDeadlines().map((deadline) => (
                        <div key={deadline.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="text-sm font-medium">{deadline.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(deadline.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={deadline.daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                            {deadline.daysRemaining}d
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Show timeline for selected project
                  <div className="space-y-3">
                    {getSelectedProject() ? (
                      <>
                        {getSelectedProject()!.startDate && (
                          <div className="p-3 bg-blue-50 rounded">
                            <p className="text-xs text-gray-600">Start Date</p>
                            <p className="text-sm font-medium">
                              {new Date(getSelectedProject()!.startDate!).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {getSelectedProject()!.endDate && (
                          <div className="p-3 bg-purple-50 rounded">
                            <p className="text-xs text-gray-600">End Date</p>
                            <p className="text-sm font-medium">
                              {new Date(getSelectedProject()!.endDate!).toLocaleDateString()}
                            </p>
                            {(() => {
                              const daysRemaining = Math.ceil(
                                (new Date(getSelectedProject()!.endDate!).getTime() - new Date().getTime()) / 
                                (1000 * 60 * 60 * 24)
                              );
                              return daysRemaining > 0 ? (
                                <Badge variant="secondary" className="mt-1">
                                  {daysRemaining} days remaining
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="mt-1">
                                  {Math.abs(daysRemaining)} days overdue
                                </Badge>
                              );
                            })()}
                          </div>
                        )}
                        {getSelectedProject()!.progress !== undefined && (
                          <div className="p-3 bg-green-50 rounded">
                            <p className="text-xs text-gray-600 mb-2">Overall Progress</p>
                            <Progress value={getSelectedProject()!.progress || 0} className="mb-1" />
                            <p className="text-sm font-medium text-center">
                              {getSelectedProject()!.progress || 0}%
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Select a project</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Health Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Current Average</p>
                    <p className={`text-4xl font-bold ${getHealthColor(getHealthTrend().current)}`}>
                      {getHealthTrend().current}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      {getHealthTrend().trend === 'improving' && (
                        <>
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Improving</span>
                        </>
                      )}
                      {getHealthTrend().trend === 'stable' && (
                        <>
                          <Activity className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Stable</span>
                        </>
                      )}
                      {getHealthTrend().trend === 'declining' && (
                        <>
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Declining</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Metrics */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-purple-600" />
                  Critical Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{projects.length}</p>
                    <p className="text-xs text-gray-600">Total Projects</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold">{getTotalTasksStats().completed}</p>
                    <p className="text-xs text-gray-600">Tasks Done</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <Clock className="h-6 w-6 mx-auto text-orange-600 mb-2" />
                    <p className="text-2xl font-bold">{getTotalTasksStats().inProgress}</p>
                    <p className="text-xs text-gray-600">In Progress</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-2" />
                    <p className="text-2xl font-bold">{getTotalTasksStats().overdue}</p>
                    <p className="text-xs text-gray-600">Overdue</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <Flame className="h-6 w-6 mx-auto text-yellow-600 mb-2" />
                    <p className="text-2xl font-bold">{getCriticalProjects().length}</p>
                    <p className="text-xs text-gray-600">Critical</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <Award className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">{getTopPerformingProjects().length}</p>
                    <p className="text-xs text-gray-600">Excellent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
