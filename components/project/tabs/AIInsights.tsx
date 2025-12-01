"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, DollarSign, Users, TrendingUp, Shuffle, Layers, MessageSquare, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AIInsightsProps {
  project: any
}

interface RiskItem {
  task: string
  risk: 'high' | 'medium' | 'low'
  reason: string
  mitigation: string
  daysAtRisk: number
}

interface CostPrediction {
  category: string
  current: number
  predicted: number
  variance: number
  trend: 'up' | 'down' | 'stable'
}

interface ResourceInsight {
  resource: string
  utilization: number
  recommendation: string
  status: 'overloaded' | 'optimal' | 'underutilized'
}

interface CompletionPrediction {
  originalDate: string
  predictedDate: string
  confidence: number
  factors: string[]
}

interface MonteCarloResult {
  p50Date: string
  p75Date: string
  p90Date: string
  iterations: number
  riskFactors: string[]
}

interface Scenario {
  name: string
  description: string
  impact: string
  probability: number
  recommendation: string
}

export default function AIInsights({ project }: AIInsightsProps) {
  const [activeTab, setActiveTab] = useState('schedule-risk')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [scheduleRisks, setScheduleRisks] = useState<RiskItem[]>([])
  const [costPredictions, setCostPredictions] = useState<CostPrediction[]>([])
  const [resourceInsights, setResourceInsights] = useState<ResourceInsight[]>([])
  const [completionPrediction, setCompletionPrediction] = useState<CompletionPrediction | null>(null)
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Analyze Schedule Risks
  const analyzeScheduleRisks = async () => {
    setLoading(prev => ({ ...prev, schedule: true }))
    try {
      const tasks = project.tasks || []
      const now = new Date()
      const risks: RiskItem[] = []

      tasks.forEach((task: any) => {
        if (task.status === 'completed') return

        const endDate = task.endDate ? new Date(task.endDate) : null
        const startDate = task.startDate ? new Date(task.startDate) : null
        const progress = task.progress || 0

        // Check for overdue tasks
        if (endDate && endDate < now && task.status !== 'completed') {
          const daysOverdue = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
          risks.push({
            task: task.name,
            risk: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
            reason: `Task is ${daysOverdue} days overdue`,
            mitigation: 'Allocate additional resources or adjust dependencies',
            daysAtRisk: daysOverdue
          })
        }

        // Check for tasks with low progress near deadline
        if (endDate && startDate) {
          const totalDuration = endDate.getTime() - startDate.getTime()
          const elapsed = now.getTime() - startDate.getTime()
          const expectedProgress = Math.min((elapsed / totalDuration) * 100, 100)
          
          if (progress < expectedProgress - 20 && task.status === 'in_progress') {
            risks.push({
              task: task.name,
              risk: expectedProgress - progress > 40 ? 'high' : 'medium',
              reason: `Progress (${progress}%) is behind expected (${Math.round(expectedProgress)}%)`,
              mitigation: 'Review blockers and consider scope adjustment',
              daysAtRisk: Math.ceil((expectedProgress - progress) / 10)
            })
          }
        }

        // Check for tasks without dates
        if (!endDate && task.status !== 'completed') {
          risks.push({
            task: task.name,
            risk: 'medium',
            reason: 'No end date defined - cannot track progress',
            mitigation: 'Define clear deadlines for better tracking',
            daysAtRisk: 0
          })
        }
      })

      // Sort by risk level
      risks.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.risk] - order[b.risk]
      })

      setScheduleRisks(risks)
      toast.success(`Found ${risks.length} schedule risks`)
    } catch (error) {
      toast.error('Failed to analyze schedule risks')
    } finally {
      setLoading(prev => ({ ...prev, schedule: false }))
    }
  }


  // Analyze Cost Predictions
  const analyzeCostPredictions = async () => {
    setLoading(prev => ({ ...prev, cost: true }))
    try {
      const res = await fetch(`/api/resources/costs?projectId=${project.id}`, { credentials: 'include' })
      const data = res.ok ? await res.json() : { totalCost: 0, byType: {} }
      
      const predictions: CostPrediction[] = []
      const tasks = project.tasks || []
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
      const totalTasks = tasks.length
      const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

      // Predict final costs based on current spending and completion rate
      Object.entries(data.byType || {}).forEach(([category, current]) => {
        const currentCost = current as number
        const predictedFinal = completionRate > 0 ? currentCost / completionRate : currentCost * 2
        const variance = ((predictedFinal - currentCost) / currentCost) * 100

        predictions.push({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          current: currentCost,
          predicted: Math.round(predictedFinal),
          variance: Math.round(variance),
          trend: variance > 10 ? 'up' : variance < -10 ? 'down' : 'stable'
        })
      })

      // Add total prediction
      if (data.totalCost > 0) {
        const predictedTotal = completionRate > 0 ? data.totalCost / completionRate : data.totalCost * 2
        predictions.unshift({
          category: 'Total Project',
          current: data.totalCost,
          predicted: Math.round(predictedTotal),
          variance: Math.round(((predictedTotal - data.totalCost) / data.totalCost) * 100),
          trend: predictedTotal > data.totalCost * 1.1 ? 'up' : 'stable'
        })
      }

      setCostPredictions(predictions)
      toast.success('Cost predictions generated')
    } catch (error) {
      toast.error('Failed to analyze costs')
    } finally {
      setLoading(prev => ({ ...prev, cost: false }))
    }
  }

  // Analyze Resource Utilization
  const analyzeResources = async () => {
    setLoading(prev => ({ ...prev, resources: true }))
    try {
      const [resourcesRes, assignmentsRes] = await Promise.all([
        fetch(`/api/resources?projectId=${project.id}`, { credentials: 'include' }),
        fetch(`/api/resources/assignments?projectId=${project.id}`, { credentials: 'include' })
      ])

      const resourcesData = resourcesRes.ok ? await resourcesRes.json() : { resources: [] }
      const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : { assignments: [] }

      const insights: ResourceInsight[] = resourcesData.resources.map((r: any) => {
        const resourceAssignments = assignmentsData.assignments.filter((a: any) => a.resourceId === r.id)
        const totalAssigned = resourceAssignments.reduce((sum: number, a: any) => sum + a.quantity, 0)
        const utilization = r.capacity ? Math.min((totalAssigned / r.capacity) * 100, 100) : 50

        let status: 'overloaded' | 'optimal' | 'underutilized'
        let recommendation: string

        if (utilization > 90) {
          status = 'overloaded'
          recommendation = 'Consider adding backup resources or redistributing workload'
        } else if (utilization > 60) {
          status = 'optimal'
          recommendation = 'Resource is well-utilized, maintain current allocation'
        } else {
          status = 'underutilized'
          recommendation = 'Can take on additional tasks or be reassigned'
        }

        return { resource: r.name, utilization: Math.round(utilization), recommendation, status }
      })

      setResourceInsights(insights)
      toast.success('Resource analysis complete')
    } catch (error) {
      toast.error('Failed to analyze resources')
    } finally {
      setLoading(prev => ({ ...prev, resources: false }))
    }
  }

  // Predict Completion
  const predictCompletion = async () => {
    setLoading(prev => ({ ...prev, completion: true }))
    try {
      const tasks = project.tasks || []
      const factors: string[] = []

      // Calculate average velocity
      const completedTasks = tasks.filter((t: any) => t.status === 'completed')
      const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress')
      const remainingTasks = tasks.filter((t: any) => t.status !== 'completed')

      // Find original end date
      const taskEndDates = tasks.filter((t: any) => t.endDate).map((t: any) => new Date(t.endDate))
      const originalEndDate = taskEndDates.length > 0 ? new Date(Math.max(...taskEndDates.map(d => d.getTime()))) : new Date()

      // Calculate predicted completion based on current progress
      let predictedDate = new Date(originalEndDate)
      let confidence = 85

      if (completedTasks.length > 0 && remainingTasks.length > 0) {
        const avgProgress = tasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / tasks.length
        
        if (avgProgress < 50) {
          predictedDate.setDate(predictedDate.getDate() + Math.round((100 - avgProgress) / 5))
          factors.push('Low overall progress detected')
          confidence -= 10
        }
      }

      // Check for overdue tasks
      const now = new Date()
      const overdueTasks = tasks.filter((t: any) => t.endDate && new Date(t.endDate) < now && t.status !== 'completed')
      if (overdueTasks.length > 0) {
        predictedDate.setDate(predictedDate.getDate() + overdueTasks.length * 3)
        factors.push(`${overdueTasks.length} overdue tasks affecting timeline`)
        confidence -= overdueTasks.length * 5
      }

      // Check resource constraints
      if (inProgressTasks.length > 5) {
        factors.push('High number of concurrent tasks may cause delays')
        confidence -= 5
      }

      setCompletionPrediction({
        originalDate: originalEndDate.toISOString().split('T')[0],
        predictedDate: predictedDate.toISOString().split('T')[0],
        confidence: Math.max(confidence, 50),
        factors: factors.length > 0 ? factors : ['Project is on track']
      })
      toast.success('Completion prediction generated')
    } catch (error) {
      toast.error('Failed to predict completion')
    } finally {
      setLoading(prev => ({ ...prev, completion: false }))
    }
  }


  // Run Monte Carlo Simulation
  const runMonteCarloSimulation = async () => {
    setLoading(prev => ({ ...prev, montecarlo: true }))
    try {
      const tasks = project.tasks || []
      const iterations = 1000
      const results: number[] = []
      const riskFactors: string[] = []

      // Get base duration
      const taskEndDates = tasks.filter((t: any) => t.endDate).map((t: any) => new Date(t.endDate))
      const baseEndDate = taskEndDates.length > 0 ? new Date(Math.max(...taskEndDates.map(d => d.getTime()))) : new Date()
      const baseDays = Math.ceil((baseEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      // Calculate risk factors
      const overdueTasks = tasks.filter((t: any) => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed')
      const lowProgressTasks = tasks.filter((t: any) => t.status === 'in_progress' && (t.progress || 0) < 30)

      if (overdueTasks.length > 0) riskFactors.push(`${overdueTasks.length} overdue tasks`)
      if (lowProgressTasks.length > 0) riskFactors.push(`${lowProgressTasks.length} tasks with low progress`)
      if (tasks.length > 20) riskFactors.push('Large number of tasks increases uncertainty')

      // Run simulation
      for (let i = 0; i < iterations; i++) {
        let totalVariance = 0
        
        tasks.forEach((task: any) => {
          if (task.status === 'completed') return
          
          // Add random variance based on task characteristics
          const baseVariance = Math.random() * 10 - 3 // -3 to +7 days
          const progressPenalty = task.status === 'in_progress' && (task.progress || 0) < 50 ? Math.random() * 5 : 0
          const overduePenalty = task.endDate && new Date(task.endDate) < new Date() ? Math.random() * 7 : 0
          
          totalVariance += baseVariance + progressPenalty + overduePenalty
        })

        results.push(baseDays + totalVariance)
      }

      // Sort and calculate percentiles
      results.sort((a, b) => a - b)
      const p50 = results[Math.floor(iterations * 0.5)]
      const p75 = results[Math.floor(iterations * 0.75)]
      const p90 = results[Math.floor(iterations * 0.9)]

      const now = new Date()
      setMonteCarloResult({
        p50Date: new Date(now.getTime() + p50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p75Date: new Date(now.getTime() + p75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p90Date: new Date(now.getTime() + p90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        iterations,
        riskFactors: riskFactors.length > 0 ? riskFactors : ['No significant risk factors identified']
      })
      toast.success('Monte Carlo simulation complete')
    } catch (error) {
      toast.error('Failed to run simulation')
    } finally {
      setLoading(prev => ({ ...prev, montecarlo: false }))
    }
  }

  // Generate Scenarios
  const generateScenarios = async () => {
    setLoading(prev => ({ ...prev, scenarios: true }))
    try {
      const tasks = project.tasks || []
      const generatedScenarios: Scenario[] = []

      // Best case scenario
      generatedScenarios.push({
        name: 'Best Case',
        description: 'All tasks complete on time with no blockers',
        impact: 'Project completes 10-15% ahead of schedule',
        probability: 15,
        recommendation: 'Maintain current momentum and resource allocation'
      })

      // Most likely scenario
      const overdueTasks = tasks.filter((t: any) => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed')
      generatedScenarios.push({
        name: 'Most Likely',
        description: `Current trajectory with ${overdueTasks.length} delayed tasks`,
        impact: overdueTasks.length > 0 ? `Project delayed by ${overdueTasks.length * 3}-${overdueTasks.length * 5} days` : 'Project on track',
        probability: 60,
        recommendation: overdueTasks.length > 0 ? 'Address delayed tasks immediately' : 'Continue monitoring progress'
      })

      // Worst case scenario
      generatedScenarios.push({
        name: 'Worst Case',
        description: 'Multiple blockers and resource constraints',
        impact: 'Project delayed by 30-45 days',
        probability: 25,
        recommendation: 'Prepare contingency plans and identify backup resources'
      })

      // Resource constraint scenario
      const inProgressCount = tasks.filter((t: any) => t.status === 'in_progress').length
      if (inProgressCount > 5) {
        generatedScenarios.push({
          name: 'Resource Bottleneck',
          description: `${inProgressCount} concurrent tasks may strain resources`,
          impact: 'Potential quality issues and delays',
          probability: 40,
          recommendation: 'Consider prioritizing critical path tasks'
        })
      }

      setScenarios(generatedScenarios)
      toast.success('Scenarios generated')
    } catch (error) {
      toast.error('Failed to generate scenarios')
    } finally {
      setLoading(prev => ({ ...prev, scenarios: false }))
    }
  }

  // Ask AI
  const askAI = async () => {
    if (!aiQuestion.trim()) {
      toast.error('Please enter a question')
      return
    }

    setAiLoading(true)
    try {
      const tasks = project.tasks || []
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
      const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length
      const overdueTasks = tasks.filter((t: any) => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completed').length
      const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / tasks.length) : 0

      // Generate contextual response based on question
      const question = aiQuestion.toLowerCase()
      let response = ''

      if (question.includes('status') || question.includes('progress') || question.includes('how')) {
        response = `**Project Status Summary:**\n\n`
        response += `• Total Tasks: ${tasks.length}\n`
        response += `• Completed: ${completedTasks} (${tasks.length > 0 ? Math.round((completedTasks/tasks.length)*100) : 0}%)\n`
        response += `• In Progress: ${inProgressTasks}\n`
        response += `• Overdue: ${overdueTasks}\n`
        response += `• Average Progress: ${avgProgress}%\n\n`
        response += overdueTasks > 0 
          ? `⚠️ There are ${overdueTasks} overdue tasks that need attention.`
          : `✅ Project is currently on track.`
      } else if (question.includes('risk') || question.includes('problem') || question.includes('issue')) {
        response = `**Risk Assessment:**\n\n`
        if (overdueTasks > 0) {
          response += `🔴 **High Risk:** ${overdueTasks} tasks are overdue\n`
        }
        if (inProgressTasks > 5) {
          response += `🟡 **Medium Risk:** High number of concurrent tasks (${inProgressTasks})\n`
        }
        if (avgProgress < 50 && tasks.length > 0) {
          response += `🟡 **Medium Risk:** Overall progress is below 50%\n`
        }
        if (overdueTasks === 0 && avgProgress >= 50) {
          response += `🟢 No significant risks identified at this time.`
        }
        response += `\n\n**Recommendation:** Focus on completing overdue tasks and monitor resource utilization.`
      } else if (question.includes('deadline') || question.includes('complete') || question.includes('finish')) {
        const taskEndDates = tasks.filter((t: any) => t.endDate).map((t: any) => new Date(t.endDate))
        const latestDate = taskEndDates.length > 0 ? new Date(Math.max(...taskEndDates.map(d => d.getTime()))) : null
        response = `**Completion Analysis:**\n\n`
        response += latestDate ? `• Planned End Date: ${latestDate.toLocaleDateString()}\n` : '• No end date defined\n'
        response += `• Current Progress: ${avgProgress}%\n`
        response += `• Tasks Remaining: ${tasks.length - completedTasks}\n\n`
        response += overdueTasks > 0 
          ? `Based on current progress and ${overdueTasks} overdue tasks, the project may be delayed by approximately ${overdueTasks * 3}-${overdueTasks * 5} days.`
          : `Based on current progress, the project is on track to meet the deadline.`
      } else {
        response = `**Project Overview:**\n\n`
        response += `Project "${project.name}" has ${tasks.length} tasks with ${avgProgress}% average progress.\n\n`
        response += `• Completed: ${completedTasks}\n`
        response += `• In Progress: ${inProgressTasks}\n`
        response += `• Overdue: ${overdueTasks}\n\n`
        response += `For specific insights, try asking about:\n`
        response += `• "What is the project status?"\n`
        response += `• "What are the risks?"\n`
        response += `• "When will the project complete?"`
      }

      setAiResponse(response)
    } catch (error) {
      toast.error('Failed to process question')
    } finally {
      setAiLoading(false)
    }
  }

  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overloaded': return 'text-red-600'
      case 'optimal': return 'text-green-600'
      case 'underutilized': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AI Project Insights</h2>
        <p className="text-sm text-muted-foreground">Get intelligent analysis and recommendations powered by AI</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="schedule-risk" className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />Schedule Risk
          </TabsTrigger>
          <TabsTrigger value="cost" className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />Cost Prediction
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" />Resources
          </TabsTrigger>
          <TabsTrigger value="completion" className="flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />Completion
          </TabsTrigger>
          <TabsTrigger value="montecarlo" className="flex items-center gap-1 text-xs">
            <Shuffle className="h-3 w-3" />Monte Carlo
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-1 text-xs">
            <Layers className="h-3 w-3" />Scenarios
          </TabsTrigger>
          <TabsTrigger value="ask" className="flex items-center gap-1 text-xs">
            <MessageSquare className="h-3 w-3" />Ask AI
          </TabsTrigger>
        </TabsList>

        {/* Schedule Risk Tab */}
        <TabsContent value="schedule-risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Risk Analysis</CardTitle>
              <CardDescription>Identify potential delays, critical path issues, and mitigation strategies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={analyzeScheduleRisks} disabled={loading.schedule}>
                {loading.schedule ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : 'Analyze Schedule Risks'}
              </Button>

              {scheduleRisks.length > 0 && (
                <div className="space-y-3 mt-4">
                  {scheduleRisks.map((risk, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${getRiskColor(risk.risk)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{risk.task}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getRiskColor(risk.risk)}`}>{risk.risk} risk</span>
                      </div>
                      <p className="text-sm mb-2">{risk.reason}</p>
                      <p className="text-sm text-muted-foreground">💡 {risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              )}

              {scheduleRisks.length === 0 && !loading.schedule && (
                <p className="text-center py-8 text-muted-foreground">Click "Analyze Schedule Risks" to identify potential issues</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Prediction Tab */}
        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Prediction</CardTitle>
              <CardDescription>Forecast project costs based on current spending patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={analyzeCostPredictions} disabled={loading.cost}>
                {loading.cost ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : 'Predict Costs'}
              </Button>

              {costPredictions.length > 0 && (
                <div className="space-y-4 mt-4">
                  {costPredictions.map((pred, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{pred.category}</span>
                        <span className={`text-sm ${pred.trend === 'up' ? 'text-red-500' : pred.trend === 'down' ? 'text-green-500' : 'text-gray-500'}`}>
                          {pred.trend === 'up' ? '↑' : pred.trend === 'down' ? '↓' : '→'} {pred.variance}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Current:</span> {formatCurrency(pred.current)}</div>
                        <div><span className="text-muted-foreground">Predicted Final:</span> {formatCurrency(pred.predicted)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {costPredictions.length === 0 && !loading.cost && (
                <p className="text-center py-8 text-muted-foreground">Click "Predict Costs" to forecast project expenses</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Analysis</CardTitle>
              <CardDescription>Analyze resource utilization and get optimization recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={analyzeResources} disabled={loading.resources}>
                {loading.resources ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : 'Analyze Resources'}
              </Button>

              {resourceInsights.length > 0 && (
                <div className="space-y-3 mt-4">
                  {resourceInsights.map((insight, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{insight.resource}</span>
                        <span className={`text-sm font-medium ${getStatusColor(insight.status)}`}>{insight.status}</span>
                      </div>
                      <div className="flex items-center gap-4 mb-2">
                        <Progress value={insight.utilization} className="flex-1" />
                        <span className="text-sm">{insight.utilization}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">💡 {insight.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {resourceInsights.length === 0 && !loading.resources && (
                <p className="text-center py-8 text-muted-foreground">Click "Analyze Resources" to get utilization insights</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completion Tab */}
        <TabsContent value="completion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completion Prediction</CardTitle>
              <CardDescription>Predict project completion date based on current progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={predictCompletion} disabled={loading.completion}>
                {loading.completion ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Predicting...</> : 'Predict Completion'}
              </Button>

              {completionPrediction && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Original End Date</div>
                        <div className="text-xl font-bold">{formatDate(completionPrediction.originalDate)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Predicted End Date</div>
                        <div className="text-xl font-bold">{formatDate(completionPrediction.predictedDate)}</div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Confidence Level</span>
                      <span className="text-sm">{completionPrediction.confidence}%</span>
                    </div>
                    <Progress value={completionPrediction.confidence} />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-2">Factors Affecting Prediction:</div>
                    <ul className="space-y-1">
                      {completionPrediction.factors.map((factor, idx) => (
                        <li key={idx} className="text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />{factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {!completionPrediction && !loading.completion && (
                <p className="text-center py-8 text-muted-foreground">Click "Predict Completion" to forecast project end date</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Monte Carlo Tab */}
        <TabsContent value="montecarlo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monte Carlo Simulation</CardTitle>
              <CardDescription>Run probabilistic analysis to predict completion dates with confidence intervals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runMonteCarloSimulation} disabled={loading.montecarlo}>
                {loading.montecarlo ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running Simulation...</> : 'Run Monte Carlo Simulation'}
              </Button>

              {monteCarloResult && (
                <div className="mt-4 space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">Based on {monteCarloResult.iterations.toLocaleString()} iterations</div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-green-50">
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-green-600">50% Confidence (P50)</div>
                        <div className="text-lg font-bold text-green-700">{formatDate(monteCarloResult.p50Date)}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-50">
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-yellow-600">75% Confidence (P75)</div>
                        <div className="text-lg font-bold text-yellow-700">{formatDate(monteCarloResult.p75Date)}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50">
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-red-600">90% Confidence (P90)</div>
                        <div className="text-lg font-bold text-red-700">{formatDate(monteCarloResult.p90Date)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-2">Risk Factors Considered:</div>
                    <ul className="space-y-1">
                      {monteCarloResult.riskFactors.map((factor, idx) => (
                        <li key={idx} className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />{factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {!monteCarloResult && !loading.montecarlo && (
                <p className="text-center py-8 text-muted-foreground">Click "Run Monte Carlo Simulation" to get probabilistic predictions</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Analysis</CardTitle>
              <CardDescription>Explore different project scenarios and their potential outcomes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateScenarios} disabled={loading.scenarios}>
                {loading.scenarios ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : 'Generate Scenarios'}
              </Button>

              {scenarios.length > 0 && (
                <div className="space-y-4 mt-4">
                  {scenarios.map((scenario, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg">{scenario.name}</span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{scenario.probability}% likely</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-xs text-muted-foreground">Impact</div>
                          <div className="text-sm font-medium">{scenario.impact}</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded">
                          <div className="text-xs text-blue-600">Recommendation</div>
                          <div className="text-sm font-medium text-blue-700">{scenario.recommendation}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {scenarios.length === 0 && !loading.scenarios && (
                <p className="text-center py-8 text-muted-foreground">Click "Generate Scenarios" to explore different outcomes</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ask AI Tab */}
        <TabsContent value="ask" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ask AI</CardTitle>
              <CardDescription>Ask questions about your project and get AI-powered insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea 
                  placeholder="Ask a question about your project... (e.g., 'What is the project status?', 'What are the risks?', 'When will the project complete?')"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  rows={3}
                />
                <Button onClick={askAI} disabled={aiLoading} className="w-full">
                  {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : 'Ask AI'}
                </Button>
              </div>

              {aiResponse && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">{aiResponse}</div>
                </div>
              )}

              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Suggested Questions:</div>
                <div className="flex flex-wrap gap-2">
                  {['What is the project status?', 'What are the main risks?', 'When will the project complete?'].map((q, idx) => (
                    <Button key={idx} variant="outline" size="sm" onClick={() => setAiQuestion(q)}>{q}</Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
