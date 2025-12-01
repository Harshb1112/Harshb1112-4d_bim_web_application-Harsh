/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Link2,
  Unlink,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Target,
  Layers,
  Box,
  Calendar,
  ArrowRight,
  Plus,
  Trash2,
  Lightbulb,
  Loader2,
  Eye,
  MousePointer
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import UnifiedModelViewer from './UnifiedModelViewer'

interface LinkingPanelProps {
  project: any
  selectedElements: string[]
  selectedTasks: string[]
  onElementSelect?: (elementIds: string[]) => void
  onTaskSelect?: (taskIds: string[]) => void
  onLinksUpdate?: () => void
  currentUserRole?: string
}

interface Link {
  id: number
  element: {
    id: number
    guid: string
    category: string
    family: string
    typeName?: string
  }
  task: {
    id: number
    name: string
    startDate: string
    endDate: string
    color: string
    progress: number
  }
  linkType: string
  status: string
  startDate?: string // New field
  endDate?: string   // New field
}

interface ElementGroup {
  category: string
  elements: any[]
  taskLinks: number
}

interface SuggestedLink {
  elementId: number
  taskId: number
  reason: string
  element?: any // To store full element data for display
  task?: any    // To store full task data for display
  isSelected?: boolean // For UI selection
}

export default function LinkingPanel({
  project,
  selectedElements,
  selectedTasks,
  onElementSelect,
  onTaskSelect,
  onLinksUpdate,
  currentUserRole = 'viewer'
}: LinkingPanelProps) {
  const canEdit = currentUserRole === 'admin' || currentUserRole === 'manager'
  
  const [links, setLinks] = useState<Link[]>([])
  const [elements, setElements] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [linkType, setLinkType] = useState('construction')
  const [linkStatus, setLinkStatus] = useState('planned')
  const [linkStartDate, setLinkStartDate] = useState<string>('')
  const [linkEndDate, setLinkEndDate] = useState<string>('')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [elementGroups, setElementGroups] = useState<ElementGroup[]>([])
  const [activeTab, setActiveTab] = useState('links')
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null)
  const viewerRef = useRef<any>(null)

  // AI Suggestion states
  const [aiElementSearch, setAiElementSearch] = useState('')
  const [aiTaskSearch, setAiTaskSearch] = useState('')
  const [suggestedLinks, setSuggestedLinks] = useState<SuggestedLink[]>([])
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)

  useEffect(() => {
    if (project?.id) {
      loadLinksData()
      loadElements()
      loadTasks()
    }
  }, [project?.id])

  useEffect(() => {
    if (elements.length > 0) {
      updateElementGroups()
    }
  }, [elements, links])

  const loadLinksData = async () => {
    try {
      const response = await fetch(`/api/links?projectId=${project.id}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setLinks(data.links || [])
      } else {
        toast.error('Failed to load links.')
      }
    } catch (error) {
      console.error('Failed to load links:', error)
      toast.error('An error occurred while loading links.')
    }
  }

  const loadElements = async () => {
    try {
      if (project.models && project.models.length > 0) {
        // Load elements from all models
        const allElements: any[] = []
        for (const model of project.models) {
          try {
            const response = await fetch(`/api/models/${model.id}/elements`, {
              credentials: 'include'
            })
            if (response.ok) {
              const data = await response.json()
              allElements.push(...(data.elements || []))
            }
          } catch (e) {
            console.error(`Failed to load elements from model ${model.id}:`, e)
          }
        }
        setElements(allElements)
      }
    } catch (error) {
      console.error('Failed to load elements:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/tasks`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      } else {
        toast.error('Failed to load tasks.')
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const updateElementGroups = () => {
    const groups: { [key: string]: ElementGroup } = {}
    elements.forEach(element => {
      const category = element.category || 'Uncategorized'
      if (!groups[category]) {
        groups[category] = { category, elements: [], taskLinks: 0 }
      }
      groups[category].elements.push(element)
      const elementLinks = links.filter(link => link.element.id === element.id)
      groups[category].taskLinks += elementLinks.length
    })
    setElementGroups(Object.values(groups))
  }

  // Highlight element in viewer
  const highlightElement = (guid: string) => {
    setHighlightedElement(guid)
    if (viewerRef.current) {
      viewerRef.current.isolateObjects([guid], true)
      toast.info('Element highlighted - will reset in 1 minute', { duration: 3000 })
      
      // Auto-reset after 1 minute (60 seconds)
      setTimeout(() => {
        if (viewerRef.current) {
          viewerRef.current.unIsolateObjects?.()
        }
        setHighlightedElement(null)
        toast.info('View reset to show all elements')
      }, 60000)
    } else {
      toast.error('Viewer not ready. Please wait for model to load.')
    }
  }

  // Handle element selection from viewer
  const handleViewerElementSelect = (elementId: string, element: any) => {
    if (onElementSelect) {
      const newSelection = selectedElements.includes(elementId)
        ? selectedElements.filter(id => id !== elementId)
        : [...selectedElements, elementId]
      onElementSelect(newSelection)
    }
  }

  const createLinks = async (elementsToLink: number[], tasksToLink: number[], type: string, status: string, startDate: string | null, endDate: string | null) => {
    if (elementsToLink.length === 0 || tasksToLink.length === 0) {
      toast.warning('Selection Required', { description: 'Please select at least one element and one task.' })
      return
    }

    setLoading(true)
    const promise = new Promise(async (resolve, reject) => {
      try {
        for (const taskId of tasksToLink) {
          const response = await fetch('/api/links', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              elementIds: elementsToLink,
              taskId,
              linkType: type,
              status,
              startDate,
              endDate,
            })
          })
          if (!response.ok) throw new Error('Failed to create links')
        }
        await loadLinksData()
        if (onElementSelect) onElementSelect([])
        if (onTaskSelect) onTaskSelect([])
        if (onLinksUpdate) onLinksUpdate()
        setLinkStartDate('')
        setLinkEndDate('')
        resolve(`${elementsToLink.length * tasksToLink.length} links created successfully!`)
      } catch (error) {
        console.error('Link creation error:', error)
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: 'Creating links...',
      success: (message) => `${message}`,
      error: 'Failed to create links. Please try again.',
    })
  }

  const removeLinks = async (linkIds: number[]) => {
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/links', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ linkIds })
        })
        if (!response.ok) throw new Error('Failed to remove links')
        await loadLinksData()
        if (onLinksUpdate) onLinksUpdate()
        resolve('Links removed successfully!')
      } catch (error) {
        console.error('Link removal error:', error)
        reject(error)
      }
    })

    toast.promise(promise, {
      loading: 'Removing links...',
      success: (message) => `${message}`,
      error: 'Failed to remove links.',
    })
  }

  const filteredLinks = links.filter(link => {
    const matchesSearch = !searchTerm ||
      link.element.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.element.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.task.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || link.element.category === filterCategory
    const matchesStatus = filterStatus === 'all' || link.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = Array.from(new Set(links.map(link => link.element.category)))

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'planned': return <Clock className="h-4 w-4 text-blue-500\" />
      case 'on_hold': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getLinkTypeIcon = (type: string) => {
    switch (type) {
      case 'construction': return <Target className="h-4 w-4 text-blue-500\" />
      case 'demolition': return <Trash2 className="h-4 w-4 text-red-500" />
      case 'temporary': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <Link2 className="h-4 w-4 text-gray-500" />
    }
  }

  // AI Suggestion Logic
  const generateSuggestions = async () => {
    setGeneratingSuggestions(true)
    setSuggestedLinks([])
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/ai/suggest-links', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            projectId: project.id,
            elementSearchTerm: aiElementSearch,
            taskSearchTerm: aiTaskSearch,
          })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate suggestions')
        }

        // If no suggestions but we have data, show helpful message
        if (data.suggestions.length === 0) {
          if (data.elementsCount === 0) {
            throw new Error('No elements found. Please upload a 3D model first.')
          }
          if (data.tasksCount === 0) {
            throw new Error('No tasks found. Please create tasks in the Schedule tab first.')
          }
          // Don't throw error, just show empty state with message
          toast.info('No automatic matches found. You can manually create links in the "Create Links" tab.')
          return
        }

        const enrichedSuggestions = data.suggestions.map((s: SuggestedLink) => ({
          ...s,
          element: elements.find(el => el.id === s.elementId),
          task: tasks.find(t => t.id === s.taskId),
          isSelected: true, // Default to selected
        }))
        setSuggestedLinks(enrichedSuggestions)
        resolve(`${enrichedSuggestions.length} suggestions generated from ${data.totalMatches} matches!`)
      } catch (error: any) {
        console.error('AI suggestion error:', error)
        reject(error)
      } finally {
        setGeneratingSuggestions(false)
      }
    })

    toast.promise(promise, {
      loading: 'Analyzing elements and tasks...',
      success: (message) => `${message}`,
      error: (err) => `${err.message}`,
    })
  }

  const toggleSuggestionSelection = (index: number) => {
    setSuggestedLinks(prev => prev.map((s, i) => i === index ? { ...s, isSelected: !s.isSelected } : s))
  }

  const createSelectedSuggestions = async () => {
    const selected = suggestedLinks.filter(s => s.isSelected)
    if (selected.length === 0) {
      toast.warning('No suggestions selected', { description: 'Please select at least one suggestion to create links.' })
      return
    }

    const elementsToLink = Array.from(new Set(selected.map(s => s.elementId)))
    const tasksToLink = Array.from(new Set(selected.map(s => s.taskId)))

    await createLinks(elementsToLink, tasksToLink, linkType, linkStatus, linkStartDate || null, linkEndDate || null)
    setSuggestedLinks([]) // Clear suggestions after creation
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">4D Linking Engine</h2>
          <p className="text-sm text-gray-500">Connect model elements to construction tasks</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">{links.length} Links</Badge>
          <Badge variant="outline" className="text-xs">{selectedElements.length} Elements</Badge>
          <Badge variant="outline" className="text-xs">{selectedTasks.length} Tasks</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full ${canEdit ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-2" />Active Links</TabsTrigger>
          {canEdit && <TabsTrigger value="create"><Plus className="h-4 w-4 mr-2" />Create Links</TabsTrigger>}
          {canEdit && <TabsTrigger value="ai-suggestion"><Lightbulb className="h-4 w-4 mr-2" />AI Suggestion</TabsTrigger>}
          <TabsTrigger value="analysis"><Layers className="h-4 w-4 mr-2" />Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4">
          {/* Viewer for highlighting elements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="h-[400px]">
              <CardHeader className="py-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  3D Model Viewer
                  {highlightedElement && (
                    <Badge variant="secondary" className="text-xs">Highlighting: {highlightedElement.slice(0, 8)}...</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-50px)]">
                <UnifiedModelViewer 
                  ref={viewerRef}
                  project={project}
                  onElementSelect={handleViewerElementSelect}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Element-Task Links</CardTitle>
                    <CardDescription>Click eye icon to highlight element in viewer</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadLinksData}><Zap className="h-4 w-4 mr-2" />Refresh</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input placeholder="Search links..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLinks.length === 0 ? (
                  <div className="text-center py-8">
                    <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No links found</p>
                    <p className="text-sm text-gray-400">Create your first element-task link</p>
                  </div>
                ) : (
                  filteredLinks.map((link) => (
                    <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex items-center space-x-2">
                            <Box className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="font-medium text-sm">{link.element.category}</p>
                              <p className="text-xs text-gray-500">{link.element.family} &bull; {link.element.guid.slice(0, 8)}...</p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="font-medium text-sm">{link.task.name}</p>
                              <p className="text-xs text-gray-500">
                                {link.startDate ? formatDate(link.startDate) : formatDate(link.task.startDate)} - {link.endDate ? formatDate(link.endDate) : formatDate(link.task.endDate)}
                              </p>
                              <p className="text-xs text-gray-500">Progress: {link.task.progress}%</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getLinkTypeIcon(link.linkType)}
                            {getStatusIcon(link.status)}
                            <Badge variant="outline" className="text-xs" style={{ borderColor: link.task.color }}>{link.linkType}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => highlightElement(link.element.guid)}
                            className={`text-blue-600 hover:text-blue-700 ${highlightedElement === link.element.guid ? 'bg-blue-100' : ''}`}
                            title="Highlight element in viewer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeLinks([link.id])} 
                            className="text-red-600 hover:text-red-700"
                            title="Remove link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          {/* Viewer for element selection */}
          <Card className="h-[400px]">
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4" />
                  Select Elements from Model
                </span>
                <Badge variant="outline">{selectedElements.length} selected</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-50px)]">
              <UnifiedModelViewer 
                ref={viewerRef}
                project={project}
                onElementSelect={handleViewerElementSelect}
                selectedElements={selectedElements}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create New Links</CardTitle>
                <CardDescription>Link selected elements to selected tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="linkType">Link Type</Label>
                    <Select value={linkType} onValueChange={setLinkType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="demolition">Demolition</SelectItem>
                        <SelectItem value="temporary">Temporary Work</SelectItem>
                        <SelectItem value="installation">Installation</SelectItem>
                        <SelectItem value="fabrication">Fabrication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="linkStatus">Status</Label>
                    <Select value={linkStatus} onValueChange={setLinkStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="linkStartDate">Link Start Date (Optional)</Label>
                      <Input
                        id="linkStartDate"
                        type="date"
                        value={linkStartDate}
                        onChange={(e) => setLinkStartDate(e.target.value)}
                        disabled={!selectedElements.length || !selectedTasks.length}
                      />
                    </div>
                    <div>
                      <Label htmlFor="linkEndDate">Link End Date (Optional)</Label>
                      <Input
                        id="linkEndDate"
                        type="date"
                        value={linkEndDate}
                        onChange={(e) => setLinkEndDate(e.target.value)}
                        disabled={!selectedElements.length || !selectedTasks.length}
                      />
                    </div>
                  </div>
                  {/* Task Selection */}
                  <div>
                    <Label>Select Tasks to Link</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 mt-1 space-y-1">
                      {tasks.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-2">No tasks available</p>
                      ) : (
                        tasks.map((task: any) => (
                          <label key={task.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task.id.toString())}
                              onChange={(e) => {
                                if (onTaskSelect) {
                                  const taskId = task.id.toString()
                                  const newSelection = e.target.checked
                                    ? [...selectedTasks, taskId]
                                    : selectedTasks.filter(id => id !== taskId)
                                  onTaskSelect(newSelection)
                                }
                              }}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="text-sm truncate">{task.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selection Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Selected Elements:</span><span className="font-medium">{selectedElements.length}</span></div>
                      <div className="flex justify-between"><span>Selected Tasks:</span><span className="font-medium">{selectedTasks.length}</span></div>
                      <div className="flex justify-between text-blue-600"><span>Links to Create:</span><span className="font-medium">{selectedElements.length * selectedTasks.length}</span></div>
                    </div>
                  </div>
                  <Button onClick={() => createLinks(elements.filter(el => selectedElements.includes(el.guid)).map(el => el.id), selectedTasks.map(Number), linkType, linkStatus, linkStartDate || null, linkEndDate || null)} disabled={loading || selectedElements.length === 0 || selectedTasks.length === 0} className="w-full">
                    {loading ? <><Zap className="h-4 w-4 mr-2 animate-spin" />Creating Links...</> : <><Link2 className="h-4 w-4 mr-2" />Create {selectedElements.length * selectedTasks.length} Links</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4D Statistics</CardTitle>
                <CardDescription>Current linking status overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2"><Box className="h-5 w-5 text-blue-600" /><span className="text-sm font-medium">Elements</span></div>
                      <p className="text-2xl font-bold text-blue-600">{elements.length}</p>
                      <p className="text-xs text-blue-600">{elements.filter(el => links.some(l => l.element.id === el.id)).length} linked</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2"><Calendar className="h-5 w-5 text-green-600" /><span className="text-sm font-medium">Tasks</span></div>
                      <p className="text-2xl font-bold text-green-600">{tasks.length}</p>
                      <p className="text-xs text-green-600">{tasks.filter(t => links.some(l => l.task.id === t.id)).length} linked</p>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2"><Link2 className="h-5 w-5 text-purple-600" /><span className="text-sm font-medium">Total Links</span></div>
                    <p className="text-2xl font-bold text-purple-600">{links.length}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs"><span>Active:</span><span>{links.filter(l => l.status === 'active').length}</span></div>
                      <div className="flex justify-between text-xs"><span>Planned:</span><span>{links.filter(l => l.status === 'planned').length}</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-suggestion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2"><Lightbulb className="h-5 w-5" /><span>AI Link Suggestions</span></CardTitle>
              <CardDescription>Get AI-powered suggestions for linking elements to tasks based on names and properties.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ai-element-search">Filter Elements (Optional)</Label>
                  <Input
                    id="ai-element-search"
                    placeholder="e.g., Wall, Door, Level 1"
                    value={aiElementSearch}
                    onChange={(e) => setAiElementSearch(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ai-task-search">Filter Tasks (Optional)</Label>
                  <Input
                    id="ai-task-search"
                    placeholder="e.g., Foundation, Install, Pour"
                    value={aiTaskSearch}
                    onChange={(e) => setAiTaskSearch(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={generateSuggestions} disabled={generatingSuggestions || elements.length === 0 || tasks.length === 0} className="w-full">
                {generatingSuggestions ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
                {generatingSuggestions ? 'Generating...' : 'Generate Suggestions'}
              </Button>

              {suggestedLinks.length > 0 && (
                <div className="space-y-4 mt-6">
                  <h3 className="text-md font-semibold">Suggested Links ({suggestedLinks.length})</h3>
                  <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {suggestedLinks.map((suggestion, index) => (
                      <div key={index} className={`flex items-center justify-between p-3 border rounded-md ${suggestion.isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={suggestion.isSelected}
                            onChange={() => toggleSuggestionSelection(index)}
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          <div>
                            <p className="font-medium text-sm">{suggestion.element?.typeName || suggestion.element?.category || 'Unknown Element'} <span className="text-gray-500 text-xs">({suggestion.element?.guid.slice(0, 8)}...)</span></p>
                            <p className="text-xs text-gray-500">Linked to: {suggestion.task?.name || 'Unknown Task'}</p>
                            <p className="text-xs text-gray-400 italic">Reason: {suggestion.reason}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">{suggestion.element?.category}</Badge>
                      </div>
                    ))}
                  </div>
                  <Button onClick={createSelectedSuggestions} disabled={loading || suggestedLinks.filter(s => s.isSelected).length === 0} className="w-full mt-4">
                    <Link2 className="h-4 w-4 mr-2" />
                    Create {suggestedLinks.filter(s => s.isSelected).length} Selected Links
                  </Button>
                </div>
              )}
              {generatingSuggestions && suggestedLinks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p>Generating suggestions...</p>
                </div>
              )}
              {!generatingSuggestions && suggestedLinks.length === 0 && (elements.length > 0 && tasks.length > 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4" />
                  <p>No suggestions generated yet. Try adjusting filters.</p>
                </div>
              )}
              {!generatingSuggestions && suggestedLinks.length === 0 && (elements.length === 0 || tasks.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4" />
                  <p>No elements or tasks available to suggest links.</p>
                  <p className="text-sm">Upload a model and create tasks first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Element Groups Analysis</CardTitle>
              <CardDescription>Analyze linking coverage by element category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {elementGroups.map((group, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{group.category}</h4>
                      <Badge variant="outline">{group.taskLinks} links</Badge>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{group.elements.length} elements</span>
                      <span>{Math.round((group.taskLinks / group.elements.length) * 100) || 0}% linked</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (group.taskLinks / group.elements.length) * 100)}%` }} />
                    </div>
                  </div>
                ))}\
                {elementGroups.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Layers className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No element data available</p>
                    <p className="text-sm">Upload a model to see analysis</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>\
        </TabsContent>
      </Tabs>
    </div>
  )
}