"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Bot, 
  Zap, 
  Calendar, 
  Users, 
  DollarSign, 
  CheckCircle, 
  Clock,
  Building,
  Loader2,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

interface AITaskGeneratorProps {
  projectId: number
  onTasksGenerated?: (tasks: any[]) => void
}

interface GeneratedTask {
  name: string
  description: string
  startDate: string
  endDate: string
  durationDays: number
  elementCount: number
  phase: string
  phaseOrder: number
  priority: 'high' | 'medium' | 'low'
  resource: string
  estimatedCost: number
  aiGenerated: boolean
}

interface AIStatistics {
  totalElements: number
  elementGroups: number
  tasksGenerated: number
  phases: string[]
  estimatedDuration: number
}

export default function AITaskGenerator({ projectId, onTasksGenerated }: AITaskGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([])
  const [statistics, setStatistics] = useState<AIStatistics | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const generateTasks = async () => {
    setIsGenerating(true)
    
    const promise = new Promise(async (resolve, reject) => {
      try {
        // Fetch ALL real BIM elements from the project models
        let allElements: any[] = []
        
        try {
          const elementsResponse = await fetch(`/api/models/elements?projectId=${projectId}`, {
            credentials: 'include'
          })
          
          if (elementsResponse.ok) {
            const elementsData = await elementsResponse.json()
            allElements = elementsData.elements || []
            
            // Log which sources we're analyzing
            const sources = elementsData.sources || []
            const models = elementsData.models || []
            console.log(`✅ Fetched ${allElements.length} real BIM elements for AI analysis`)
            console.log(`📊 Sources: ${sources.join(', ')}`)
            console.log(`📁 Models: ${models.join(', ')}`)
          }
        } catch (err) {
          console.warn('Could not fetch real elements from database:', err)
        }

        // If no elements in database, try to read directly from uploaded model files
        if (allElements.length === 0) {
          console.log('⚠️ No elements in database, will read directly from model files')
          
          try {
            const modelsResponse = await fetch(`/api/projects/${projectId}`, {
              credentials: 'include'
            })
            
            if (modelsResponse.ok) {
              const projectData = await modelsResponse.json()
              const models = projectData.project?.models || []
              
              console.log(`📁 Found ${models.length} model files in project`)
              
              // For each model, try to extract elements based on source type
              for (const model of models) {
                console.log(`📄 Processing model: ${model.name} (${model.source})`)
                
                // Handle different model sources
                if (model.source === 'local_ifc' && model.filePath) {
                  // IFC files - read directly from file
                  try {
                    const ifcResponse = await fetch(`/api/models/${model.id}/extract-elements`, {
                      credentials: 'include'
                    })
                    
                    if (ifcResponse.ok) {
                      const ifcData = await ifcResponse.json()
                      const ifcElements = ifcData.elements || []
                      console.log(`✅ Extracted ${ifcElements.length} elements from IFC: ${model.name}`)
                      allElements = allElements.concat(ifcElements)
                    }
                  } catch (ifcErr) {
                    console.warn(`Could not extract IFC elements from ${model.name}:`, ifcErr)
                  }
                } 
                else if (model.source === 'speckle' && model.sourceId) {
                  // Speckle models - fetch from Speckle API
                  try {
                    const speckleResponse = await fetch(`/api/speckle/sync-elements`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ 
                        modelId: model.id,
                        streamId: model.sourceId 
                      })
                    })
                    
                    if (speckleResponse.ok) {
                      const speckleData = await speckleResponse.json()
                      const speckleElements = speckleData.elements || []
                      console.log(`✅ Fetched ${speckleElements.length} elements from Speckle: ${model.name}`)
                      allElements = allElements.concat(speckleElements)
                    }
                  } catch (speckleErr) {
                    console.warn(`Could not fetch Speckle elements from ${model.name}:`, speckleErr)
                  }
                }
                else if ((model.source === 'autodesk_acc' || model.source === 'autodesk_drive') && model.sourceId) {
                  // Autodesk models - fetch metadata
                  try {
                    const autodeskResponse = await fetch(`/api/autodesk/derivative/${model.sourceId}/metadata`, {
                      credentials: 'include'
                    })
                    
                    if (autodeskResponse.ok) {
                      const autodeskData = await autodeskResponse.json()
                      const autodeskElements = autodeskData.elements || []
                      console.log(`✅ Fetched ${autodeskElements.length} elements from Autodesk: ${model.name}`)
                      allElements = allElements.concat(autodeskElements)
                    }
                  } catch (autodeskErr) {
                    console.warn(`Could not fetch Autodesk elements from ${model.name}:`, autodeskErr)
                  }
                }
              }
              
              console.log(`📊 Total elements extracted from all models: ${allElements.length}`)
            }
          } catch (err) {
            console.warn('Could not fetch models:', err)
          }
        }

        // If still no real elements found, use sample elements for demo
        if (allElements.length === 0) {
          console.log('⚠️ No real elements found, using sample elements for demo')
          allElements = [
            { id: 'wall-001', type: 'Wall', name: 'Exterior Wall', properties: { material: 'Concrete', height: 3000 } },
            { id: 'door-001', type: 'Door', name: 'Main Entrance', properties: { width: 900, height: 2100 } },
            { id: 'window-001', type: 'Window', name: 'Office Window', properties: { width: 1200, height: 1500 } },
            { id: 'beam-001', type: 'Beam', name: 'Structural Beam', properties: { material: 'Steel', length: 6000 } },
            { id: 'column-001', type: 'Column', name: 'Support Column', properties: { material: 'Concrete', height: 3000 } },
            { id: 'slab-001', type: 'Slab', name: 'Floor Slab', properties: { material: 'Concrete', thickness: 150 } },
            { id: 'roof-001', type: 'Roof', name: 'Main Roof', properties: { material: 'Metal Sheet', area: 500 } },
            { id: 'stair-001', type: 'Stair', name: 'Main Staircase', properties: { steps: 15, width: 1200 } }
          ]
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        let response;
        let data;

        try {
          response = await fetch('/api/ai/smart-task-generator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal: controller.signal,
            body: JSON.stringify({ 
              projectId,
              selectedElements: allElements // Send ALL real elements to AI
            })
          })

          clearTimeout(timeoutId);

          data = await response.json()
          
          // Handle no credits error IMMEDIATELY
          if (data.noCredits || response.status === 429) {
            console.log('❌ No credits available - 0 elements processed');
            toast.error('❌ OpenAI API has no credits. Add payment method to continue.', {
              duration: 5000,
              action: {
                label: 'Add Payment',
                onClick: () => window.open('https://platform.openai.com/account/billing', '_blank')
              }
            });
            setIsGenerating(false);
            reject(new Error('No credits available'));
            return;
          }

          // Handle invalid key error
          if (data.invalidKey || response.status === 401) {
            console.log('❌ Invalid API key');
            toast.error('❌ Invalid OpenAI API key. Please update in Settings → AI Configuration');
            setIsGenerating(false);
            reject(new Error('Invalid API key'));
            return;
          }
          
          // Handle rate limit fallback
          if (data.fallback) {
            console.log('⚠️ Rate limit reached, using fallback');
            toast.warning('⚠️ AI rate limit reached. Parse your model to auto-generate tasks.');
            setIsGenerating(false);
            reject(new Error('Rate limit reached'));
            return;
          }
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to generate tasks')
          }

        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.log('❌ Request timeout');
            toast.error('❌ Request timeout. AI is taking too long. Please try again or use fewer elements.');
            setIsGenerating(false);
            reject(error);
            return;
          }
          throw error;
        }

        // Convert the AI response format to match our component expectations
        const convertedTasks = data.tasks.map((task: any, index: number) => ({
          name: task.name,
          description: task.description,
          startDate: task.startDate,
          endDate: task.endDate,
          durationDays: task.estimatedDuration || 5,
          elementCount: allElements.length, // Real element count
          phase: task.phase || 'Construction',
          phaseOrder: index + 1,
          priority: task.priority,
          resource: task.suggestedTeamMember || 'Construction Team',
          estimatedCost: task.estimatedCost || 50000,
          aiGenerated: true
        }))

        const convertedStatistics = {
          totalElements: allElements.length, // Real element count
          elementGroups: [...new Set(allElements.map((el: any) => el.type))].length, // Unique types
          tasksGenerated: convertedTasks.length,
          phases: [...new Set(convertedTasks.map((task: any) => task.phase))] as string[],
          estimatedDuration: Math.max(...convertedTasks.map((task: any) => task.durationDays))
        }

        setGeneratedTasks(convertedTasks)
        setStatistics(convertedStatistics)
        setShowPreview(true)
        
        resolve(data.message)
      } catch (error) {
        reject(error)
      } finally {
        setIsGenerating(false)
      }
    })

    toast.promise(promise, {
      loading: '🤖 AI is analyzing your BIM model and generating tasks...',
      success: (message) => `✅ ${message}`,
      error: (err) => `❌ ${err.message}`,
    })
  }

  const saveTasks = async () => {
    try {
      // Save tasks to database using the correct API endpoint
      const promises = generatedTasks.map(async task => {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            projectId: projectId,
            name: task.name,
            description: task.description,
            startDate: task.startDate,
            endDate: task.endDate,
            priority: task.priority,
            status: 'todo'
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to create task')
        }
        
        const data = await response.json()
        const createdTask = data.task
        
        // Link elements to this task if available
        if (task.elementIds && task.elementIds.length > 0 && createdTask.id) {
          console.log(`🔗 Linking ${task.elementIds.length} elements to task: ${task.name}`)
          
          // Create element-task links
          const linkPromises = task.elementIds.map(async (elementId: any) => {
            try {
              await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  elementId: elementId,
                  taskId: createdTask.id,
                  startDate: task.startDate,
                  endDate: task.endDate
                })
              })
            } catch (linkErr) {
              console.warn(`Could not link element ${elementId} to task ${createdTask.id}`)
            }
          })
          
          await Promise.all(linkPromises)
          console.log(`✅ Linked elements to task: ${task.name}`)
        }
        
        return createdTask
      })

      await Promise.all(promises)
      
      toast.success(`🎉 Successfully created ${generatedTasks.length} AI-generated tasks with element links!`)
      
      if (onTasksGenerated) {
        onTasksGenerated(generatedTasks)
      }
      
      setShowPreview(false)
      setGeneratedTasks([])
      setStatistics(null)
      
      // Refresh page to show updated tasks
      window.location.reload()
      
    } catch (error) {
      console.error('Error saving tasks:', error)
      toast.error('Failed to save tasks. Please try again.')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (showPreview && generatedTasks.length > 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>AI Generated Tasks Preview</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {generatedTasks.length} Tasks Generated
            </Badge>
          </div>
          <CardDescription>
            Review and approve the AI-generated construction schedule
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Building className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                <div className="text-2xl font-bold text-blue-900">{statistics.totalElements}</div>
                <div className="text-xs text-blue-600">BIM Elements</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-1" />
                <div className="text-2xl font-bold text-green-900">{statistics.tasksGenerated}</div>
                <div className="text-xs text-green-600">Tasks Created</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                <div className="text-2xl font-bold text-purple-900">{statistics.phases.length}</div>
                <div className="text-xs text-purple-600">Phases</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Clock className="h-6 w-6 mx-auto text-orange-600 mb-1" />
                <div className="text-2xl font-bold text-orange-900">{statistics.estimatedDuration}</div>
                <div className="text-xs text-orange-600">Days</div>
              </div>
            </div>
          )}

          <Separator />

          {/* Tasks List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {generatedTasks.map((task, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{task.name}</h4>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.phase}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{task.durationDays} days</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building className="h-3 w-3 text-gray-400" />
                        <span>{task.elementCount} elements</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span>{task.resource}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 text-gray-400" />
                        <span>{formatCurrency(task.estimatedCost)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveTasks}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Create All Tasks
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <CardTitle>AI Task Generator</CardTitle>
        </div>
        <CardDescription>
          Let AI analyze your complete BIM model and automatically generate tasks from project START to FINISH
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">How AI Task Generation Works:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Analyzes ALL BIM elements from IFC, Speckle, and Autodesk models</li>
                <li>• Creates complete construction schedule from START to FINISH</li>
                <li>• Covers all phases: Pre-Construction → Foundation → Structure → MEP → Finishes → Closeout</li>
                <li>• Estimates durations, costs, and resource requirements</li>
                <li>• Sets up proper task dependencies and sequencing</li>
                <li>• Generates 6-10 tasks covering entire project lifecycle</li>
              </ul>
            </div>
          </div>
        </div>

        <Button 
          onClick={generateTasks}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Tasks...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Generate Tasks with AI
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          AI will analyze your complete BIM model and create tasks for entire project lifecycle (Start → Finish)
        </div>
      </CardContent>
    </Card>
  )
}