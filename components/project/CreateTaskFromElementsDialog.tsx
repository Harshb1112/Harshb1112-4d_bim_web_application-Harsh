'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Box, Calendar, User, AlertCircle, Bot, Sparkles } from 'lucide-react'

interface CreateTaskFromElementsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedElements: Array<{
    id: string
    type?: string
    name?: string
    properties?: any
  }>
  projectId: number
  teams?: Array<{ id: number; name: string }>
  users?: Array<{ id: number; fullName: string; role: string }>
  onTaskCreated?: () => void
}

export default function CreateTaskFromElementsDialog({
  open,
  onOpenChange,
  selectedElements,
  projectId,
  teams = [],
  users = [],
  onTaskCreated
}: CreateTaskFromElementsDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    assigneeId: '',
    teamId: '',
    priority: 'medium',
    status: 'todo'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [selectedAISuggestion, setSelectedAISuggestion] = useState<any>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        assigneeId: '',
        teamId: '',
        priority: 'medium',
        status: 'todo'
      })
    }
  }, [open])

  const elementsByType = selectedElements.reduce((acc, el) => {
    const type = el.type || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Real AI Task Generation Function using OpenAI GPT
  const generateAISuggestions = async () => {
    setIsGeneratingAI(true)
    try {
      console.log('🤖 Calling Real AI (OpenAI GPT) for task analysis...')
      
      const response = await fetch('/api/ai/smart-task-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          selectedElements: selectedElements.map(el => ({
            id: el.id,
            type: el.type,
            name: el.name,
            properties: el.properties,
            guid: el.id // Assuming id can be used as guid
          }))
        })
      })

      const data = await response.json()
      
      // Handle no credits error
      if (data.noCredits || response.status === 429) {
        toast.error('❌ OpenAI API has no credits. Add payment method to continue.', {
          duration: 5000,
          action: {
            label: 'Add Payment',
            onClick: () => window.open('https://platform.openai.com/account/billing', '_blank')
          }
        });
        return;
      }

      // Handle invalid key error
      if (data.invalidKey || response.status === 401) {
        toast.error('❌ Invalid OpenAI API key. Please update in Settings → AI Configuration');
        return;
      }

      // Handle rate limit fallback
      if (data.fallback) {
        console.log('⚠️ Rate limit reached, using fallback');
        toast.warning('⚠️ AI rate limit reached. Using automatic task generation instead.');
        generateBasicSuggestions();
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI suggestions')
      }

      console.log('✅ Real AI Analysis Complete:', data.message)
      setAiSuggestions(data.tasks || [])
      
      // Show analysis summary
      if (data.analysis) {
        toast.success(`🤖 AI analyzed ${data.analysis.elementsAnalyzed} elements using ${data.analysis.aiModel}`)
      }
      
    } catch (error) {
      console.error('Real AI suggestion generation failed:', error)
      toast.error(`❌ AI Analysis Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Fallback to basic suggestions if AI fails
      console.log('Falling back to basic rule-based suggestions...')
      generateBasicSuggestions()
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Fallback basic suggestions (in case AI fails)
  const generateBasicSuggestions = () => {
    const suggestions = []
    const elementTypes = Object.keys(elementsByType)
    
    for (const elementType of elementTypes) {
      const count = elementsByType[elementType]
      suggestions.push({
        name: `Install ${elementType} (${count} elements)`,
        description: `Installation of ${count} ${elementType.toLowerCase()} elements as per project specifications.`,
        priority: 'medium',
        estimatedDuration: Math.max(1, Math.ceil(count / 10)),
        phase: 'General Construction',
        suggestedTeamMember: 'General Construction Team',
        estimatedCost: count * 2000,
        aiGenerated: false,
        aiReasoning: 'Basic rule-based suggestion (AI unavailable)'
      })
    }
    
    setAiSuggestions(suggestions)
  }

  const applyAISuggestion = (suggestion: any) => {
    setSelectedAISuggestion(suggestion)
    
    // Calculate dates
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1) // Start tomorrow
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + suggestion.estimatedDuration)
    
    setFormData({
      name: suggestion.name,
      description: suggestion.description,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      assigneeId: '',
      teamId: '',
      priority: suggestion.priority,
      status: 'todo'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Task name is required')
      return
    }

    if (selectedElements.length === 0) {
      toast.error('No elements selected')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : null,
          teamId: formData.teamId ? parseInt(formData.teamId) : null,
          priority: formData.priority,
          status: formData.status,
          elementIds: selectedElements.map(el => el.id)
        })
      })

      // Handle non-JSON error responses
      const contentType = response.headers.get('content-type')
      if (!response.ok) {
        if (contentType?.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create task')
        } else {
          const text = await response.text()
          throw new Error(text || `Server error: ${response.status}`)
        }
      }

      const result = await response.json()
      
      // Show success message with background processing info
      if (result.message) {
        toast.success(result.message, { duration: 5000 })
      } else {
        toast.success(`Task created with ${selectedElements.length} linked elements!`)
      }
      
      onOpenChange(false)
      onTaskCreated?.()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task from Selected Elements</DialogTitle>
          <DialogDescription>
            Choose between manual task creation or AI-powered smart suggestions.
          </DialogDescription>
        </DialogHeader>

        {/* Element Preview */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Box className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">
              {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} will be linked
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(elementsByType).map(([type, count]) => (
              <Badge key={type} variant="secondary">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Manual Creation</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center space-x-2">
              <Bot className="h-4 w-4" />
              <span>🤖 AI Suggestions</span>
            </TabsTrigger>
          </TabsList>

          {/* Manual Task Creation */}
          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Install doors on Level 1"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add task details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamId">Team</Label>
                <Select
                  value={formData.teamId}
                  onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assigneeId">Assignee</Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </TabsContent>

      {/* AI Suggestions Tab */}
      <TabsContent value="ai" className="space-y-4">
        <div className="text-center py-4">
          <Button 
            onClick={generateAISuggestions}
            disabled={isGeneratingAI}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isGeneratingAI ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating AI Suggestions...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Generate Smart Task Suggestions
              </>
            )}
          </Button>
        </div>

        {aiSuggestions.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-gray-900">AI-Generated Task Suggestions:</h4>
            {aiSuggestions.map((suggestion, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedAISuggestion === suggestion 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => applyAISuggestion(suggestion)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 mb-1">{suggestion.name}</h5>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{suggestion.estimatedDuration} days</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 text-gray-400" />
                        <span className="capitalize">{suggestion.priority}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span>{suggestion.suggestedTeamMember || suggestion.resource || 'TBD'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-green-600 font-medium">
                          ₹{suggestion.estimatedCost?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>
                    
                    {suggestion.aiReasoning && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                        <strong>🤖 AI Analysis:</strong> {suggestion.aiReasoning}
                      </div>
                    )}
                    
                    {suggestion.materials && suggestion.materials.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        <strong>Materials:</strong> {suggestion.materials.join(', ')}
                      </div>
                    )}
                    
                    {suggestion.safetyConsiderations && suggestion.safetyConsiderations.length > 0 && (
                      <div className="mt-1 text-xs text-orange-600">
                        <strong>⚠️ Safety:</strong> {suggestion.safetyConsiderations.join(', ')}
                      </div>
                    )}
                  </div>
                  
                  {selectedAISuggestion === suggestion && (
                    <Badge className="bg-blue-600">Selected</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedAISuggestion && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Review & Customize:</h4>
            
            <div>
              <Label htmlFor="ai-name">Task Name *</Label>
              <Input
                id="ai-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="ai-description">Description</Label>
              <Textarea
                id="ai-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ai-start">Start Date</Label>
                <Input
                  id="ai-start"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ai-end">End Date</Label>
                <Input
                  id="ai-end"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Team</Label>
                <Select
                  value={formData.teamId}
                  onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assignee</Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? 'Creating...' : '🤖 Create AI Task'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </TabsContent>
    </Tabs>
      </DialogContent>
    </Dialog>
  )
}
