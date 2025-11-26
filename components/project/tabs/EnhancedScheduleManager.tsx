/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Box, 
  Filter, 
  MousePointer, 
  Square, 
  Lasso, 
  Layers,
  PlusCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import GanttChart from '../GanttChart'
import UnifiedModelViewer from '../UnifiedModelViewer'
import CreateTaskFromElementsDialog from '../CreateTaskFromElementsDialog'

interface EnhancedScheduleManagerProps {
  project: any
  currentUserRole?: string
  currentUserId?: number
  userSeniority?: string | null
}

export default function EnhancedScheduleManager({ project, currentUserRole, currentUserId, userSeniority }: EnhancedScheduleManagerProps) {
  // Tasks state
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Element selection state
  const [selectedElements, setSelectedElements] = useState<Array<{
    id: string
    type?: string
    name?: string
    properties?: any
  }>>([])
  const [selectionMode, setSelectionMode] = useState<'single' | 'box' | 'lasso' | 'layer'>('box') // Default to multi-select
  const [elementTypeFilter, setElementTypeFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState<string>('')

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [taskProgress, setTaskProgress] = useState<number>(0)
  const [taskStatus, setTaskStatus] = useState<string>('todo')
  const [updating, setUpdating] = useState(false)

  // Teams and users for task creation
  const [teams, setTeams] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    fetchTasks()
  }, [project.id])

  // Only fetch teams and users when dialog opens
  useEffect(() => {
    if (showCreateDialog && teams.length === 0) {
      fetchTeams()
    }
    if (showCreateDialog && users.length === 0) {
      fetchUsers()
    }
  }, [showCreateDialog])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      console.log('Fetching tasks for project:', project.id)
      const response = await fetch(`/api/tasks?projectId=${project.id}`)
      console.log('Tasks API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Tasks data received:', data)
        setTasks(data.tasks || [])
        
        if (data.tasks && data.tasks.length > 0) {
          toast.success(`Loaded ${data.tasks.length} tasks`)
        }
      } else {
        const errorText = await response.text()
        console.error('Tasks API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || 'Failed to load tasks' }
        }
        
        toast.error(errorData.error || `Failed to load tasks (${response.status})`)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleElementSelect = useCallback((elementId: string, element: any) => {
    console.log('Element selected:', elementId, element)
    console.log('Current selection mode:', selectionMode)
    console.log('Current selected elements count:', selectedElements.length)
    
    // Extract element type from various possible properties
    let elementType = 'Unknown'
    if (element.type) elementType = element.type
    else if (element.speckle_type) {
      // Extract type from speckle_type (e.g., "Objects.BuiltElements.Revit.RevitWall" -> "Wall")
      const parts = element.speckle_type.split('.')
      elementType = parts[parts.length - 1].replace('Revit', '')
    }
    else if (element.category) elementType = element.category
    else if (element.userData?.category) elementType = element.userData.category
    
    // Extract better name with more details
    let elementName = element.name || element.userData?.name
    
    // If no name, try to build one from properties
    if (!elementName || elementName === '_0' || elementName.trim() === '') {
      // Try common property names
      elementName = element.userData?.Family || 
                   element.userData?.Type || 
                   element.userData?.Category ||
                   element.properties?.Family ||
                   element.properties?.Type ||
                   `${elementType}_${elementId.slice(0, 8)}`
    }
    
    const newElement = {
      id: elementId,
      type: elementType,
      name: elementName,
      properties: element.userData || element
    }

    console.log('Processed element:', newElement)

    setSelectedElements(prev => {
      if (selectionMode === 'single') {
        toast.info(`Selected: ${newElement.name}`)
        return [newElement]
      } else if (selectionMode === 'layer') {
        // Layer mode: Smart type-based selection
        const sameTypeInSelection = prev.filter(el => el.type === newElement.type)
        const clickedElementExists = prev.find(el => el.id === elementId)
        
        if (clickedElementExists) {
          // If clicked element is already selected, remove ALL of this type
          toast.info(`🗑️ Removed all ${newElement.type} elements from selection`)
          return prev.filter(el => el.type !== newElement.type)
        } else if (sameTypeInSelection.length > 0) {
          // If other elements of this type exist, add this one to the layer
          toast.info(`➕ Added ${newElement.name} to ${newElement.type} layer (${sameTypeInSelection.length + 1} total)`)
          return [...prev, newElement]
        } else {
          // First element of this type - start new layer
          toast.info(`🆕 Started new ${newElement.type} layer - click more ${newElement.type} to add to layer`)
          return [...prev, newElement]
        }
      } else if (selectionMode === 'lasso') {
        // Lasso mode: Only adds, never removes (rapid selection)
        const exists = prev.find(el => el.id === elementId)
        if (exists) {
          toast.info(`⚡ ${newElement.name} already in selection`)
          return prev // Don't remove, just keep it
        } else {
          toast.info(`⚡ Added: ${newElement.name} (${prev.length + 1} total)`)
          return [...prev, newElement]
        }
      } else {
        // Multi/box mode: Toggle on/off
        const exists = prev.find(el => el.id === elementId)
        if (exists) {
          toast.info(`❌ Removed: ${newElement.name}`)
          return prev.filter(el => el.id !== elementId)
        } else {
          toast.info(`✅ Added: ${newElement.name}`)
          return [...prev, newElement]
        }
      }
    })
  }, [selectionMode, selectedElements])

  const handleCreateTask = () => {
    // Admin, Manager, and Senior Team Leader can create tasks
    const isSeniorLeader = currentUserRole === 'team_leader' && userSeniority === 'senior'
    
    if (currentUserRole !== 'admin' && currentUserRole !== 'manager' && !isSeniorLeader) {
      toast.error('Only Admin, Manager, and Senior Team Leader can create tasks')
      return
    }
    
    if (selectedElements.length === 0) {
      toast.error('Please select at least one element')
      return
    }
    setShowCreateDialog(true)
  }
  
  // Check if user can create tasks (Admin, Manager, or Senior Team Leader)
  const isSeniorLeader = currentUserRole === 'team_leader' && userSeniority === 'senior'
  const canCreateTasks = currentUserRole === 'admin' || currentUserRole === 'manager' || isSeniorLeader

  const handleClearSelection = () => {
    setSelectedElements([])
    toast.info('Selection cleared')
  }

  const handleTaskCreated = () => {
    fetchTasks()
    setSelectedElements([])
    setShowCreateDialog(false)
  }

  const handleTaskClick = (task: any) => {
    console.log('Task clicked:', task)
    
    // Check if user can update this task
    if (currentUserRole === 'viewer' || currentUserRole === 'member') {
      // Viewer/Member can only update their own assigned tasks
      // We'll check assigneeId in the dialog, for now just open it
      setSelectedTask(task)
      setTaskProgress(Number(task.progress || 0))
      setTaskStatus(task.status || 'todo')
      setShowUpdateDialog(true)
    } else {
      // Team Leader, Manager, Admin can update any task
      setSelectedTask(task)
      setTaskProgress(Number(task.progress || 0))
      setTaskStatus(task.status || 'todo')
      setShowUpdateDialog(true)
    }
  }

  const handleUpdateTask = async () => {
    if (!selectedTask) return
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          progress: taskProgress,
          status: taskStatus
        })
      })

      if (response.ok) {
        toast.success('Task updated successfully!')
        await fetchTasks()
        setShowUpdateDialog(false)
        setSelectedTask(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Error updating task')
    } finally {
      setUpdating(false)
    }
  }

  // Filter elements by type AND search text
  const filteredElements = selectedElements.filter(el => {
    // Filter by type
    const typeMatch = elementTypeFilter === 'all' || 
                     el.type?.toLowerCase().includes(elementTypeFilter.toLowerCase())
    
    // Filter by search text (trim whitespace and handle special chars)
    const searchLower = searchText.trim().toLowerCase()
    const elementName = (el.name || '').toLowerCase()
    const elementType = (el.type || '').toLowerCase()
    const elementId = (el.id || '').toLowerCase()
    
    const searchMatch = searchLower === '' || 
                       elementName.includes(searchLower) ||
                       elementType.includes(searchLower) ||
                       elementId.includes(searchLower)
    
    // Debug logging
    if (searchText) {
      console.log('Filter check:', {
        element: el.name,
        searchText: searchLower,
        nameMatch: el.name?.toLowerCase().includes(searchLower),
        typeMatch,
        searchMatch
      })
    }
    
    return typeMatch && searchMatch
  })

  // Count elements by type
  const elementCounts = selectedElements.reduce((acc, el) => {
    const type = el.type || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count elements by name
  const elementNameCounts = selectedElements.reduce((acc, el) => {
    const name = el.name || 'Unknown'
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Get duplicate names (names that appear more than once) - RESTORED
  const duplicateNames = Object.entries(elementNameCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
  
  // Also get all unique names for reference
  const uniqueNames = Object.entries(elementNameCounts)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Schedule</h2>
          <p className="text-sm text-gray-500 mt-1">Select BIM elements and create tasks</p>
        </div>
        <Button onClick={fetchTasks} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Role Info Banner for non-creators */}
      {!canCreateTasks && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-sm text-blue-800">
              <strong>👁️ {
                currentUserRole === 'viewer' ? 'Viewer' : 
                currentUserRole === 'member' ? 'Member' : 
                currentUserRole === 'team_leader' && userSeniority === 'junior' ? 'Junior Team Leader' :
                'Team Leader'
              } Mode</strong>
              <p className="mt-2">
                {currentUserRole === 'team_leader' 
                  ? userSeniority === 'junior'
                    ? 'You can view and update all tasks in your team. Only Senior Team Leader, Manager, or Admin can create new tasks.'
                    : 'You can view and update all tasks in your team. Contact Manager/Admin to create new tasks.'
                  : 'You can view tasks and update progress on your assigned tasks. Only Admin/Manager/Senior Team Leader can create new tasks.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Element Selection - Only for Admin/Manager/Senior Leader */}
        {canCreateTasks && (
        <div className="lg:col-span-1 space-y-4">
          {/* Selection Mode */}
          <Card>

            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Selection Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectionMode === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectionMode('single')
                    toast.info('Single select mode: Click one element at a time')
                  }}
                  className="flex flex-col h-auto py-2"
                >
                  <MousePointer className="h-4 w-4 mb-1" />
                  <span className="text-xs">Single</span>
                </Button>
                <Button
                  variant={selectionMode === 'box' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    console.log('Setting selection mode to: box')
                    setSelectionMode('box')
                    toast.info('Multi-select mode: Click multiple elements')
                  }}
                  className="flex flex-col h-auto py-2"
                >
                  <Square className="h-4 w-4 mb-1" />
                  <span className="text-xs">Multi</span>
                </Button>
                <Button
                  variant={selectionMode === 'lasso' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectionMode('lasso')
                    toast.info('Lasso mode: Rapid multi-select (click quickly to add multiple)')
                  }}
                  className="flex flex-col h-auto py-2"
                >
                  <Lasso className="h-4 w-4 mb-1" />
                  <span className="text-xs">Lasso</span>
                </Button>
                <Button
                  variant={selectionMode === 'layer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectionMode('layer')
                    toast.info('Layer mode: Select by type')
                  }}
                  className="flex flex-col h-auto py-2"
                >
                  <Layers className="h-4 w-4 mb-1" />
                  <span className="text-xs">Layer</span>
                </Button>
              </div>
              
              {/* Instructions */}
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                {selectionMode === 'single' && '👆 Single: Click one element (replaces previous)'}
                {selectionMode === 'box' && '📦 Multi: Click multiple elements (add/remove toggle)'}
                {selectionMode === 'lasso' && '⚡ Lasso: Rapid multi-select (only adds, no toggle)'}
                {selectionMode === 'layer' && '📚 Layer: Group by type (click same type to build layer)'}
              </div>
              
              {/* Layer mode helper */}
              {selectionMode === 'layer' && selectedElements.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs p-2 bg-green-50 border border-green-200 rounded">
                    💡 Layer Mode Active:
                    <br />• Click same type → Adds to layer
                    <br />• Click selected → Removes all of that type
                  </div>
                  {/* Quick actions for layer mode */}
                  <div className="text-xs text-gray-600">
                    Active layers: {Object.keys(elementCounts).join(', ')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Element Type Filter with Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search by name */}
              <div>
                <Label className="text-xs text-gray-600 mb-1">Search by Name</Label>
                <Input
                  placeholder="Type to search... (e.g., F02_0)"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="h-8 text-sm"
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Clear search
                  </button>
                )}
              </div>
              
              {/* Quick filter by type */}
              <div>
                <Label className="text-xs text-gray-600 mb-1">Quick Filter</Label>
                <Select value={elementTypeFilter} onValueChange={setElementTypeFilter}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="door">Doors</SelectItem>
                    <SelectItem value="wall">Walls</SelectItem>
                    <SelectItem value="column">Columns</SelectItem>
                    <SelectItem value="slab">Slabs</SelectItem>
                    <SelectItem value="window">Windows</SelectItem>
                    <SelectItem value="beam">Beams</SelectItem>
                    <SelectItem value="mesh">Mesh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Selected Elements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Box className="h-4 w-4" />
                Selected Elements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedElements.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  <Box className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No elements selected</p>
                  <p className="text-xs mt-1">Click elements in 3D viewer</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {elementTypeFilter === 'all' && searchText === '' ? (
                        <>{selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected</>
                      ) : (
                        <>
                          {filteredElements.length} of {selectedElements.length} elements
                          {searchText && <span className="text-blue-600"> (search: "{searchText}")</span>}
                          {elementTypeFilter !== 'all' && <span className="text-green-600"> (type: {elementTypeFilter})</span>}
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('=== DEBUG INFO ===')
                        console.log('Selection Mode:', selectionMode)
                        console.log('Selected Elements:', selectedElements)
                        console.log('Element Count:', selectedElements.length)
                        console.log('Search Text:', `"${searchText}"`)
                        console.log('Type Filter:', elementTypeFilter)
                        console.log('Filtered Count:', filteredElements.length)
                        console.log('\nElement Details:')
                        selectedElements.forEach((el, i) => {
                          console.log(`${i + 1}. Name: "${el.name}" | Type: "${el.type}" | ID: "${el.id?.substring(0, 20)}..."`)
                        })
                        console.log('\nSearch Test:')
                        if (searchText) {
                          selectedElements.forEach(el => {
                            const match = el.name?.toLowerCase().includes(searchText.toLowerCase())
                            console.log(`"${el.name}" includes "${searchText}"? ${match}`)
                          })
                        }
                        toast.info(`Total: ${selectedElements.length}, Filtered: ${filteredElements.length}`)
                      }}
                      className="text-xs h-6"
                    >
                      Debug
                    </Button>
                  </div>
                  
                  {/* Element counts by type - Clickable to filter */}
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">Click badge to filter:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(elementCounts).map(([type, count]) => (
                        <Badge 
                          key={type} 
                          variant={elementTypeFilter === 'all' || elementTypeFilter === type.toLowerCase() ? 'default' : 'secondary'} 
                          className="text-xs cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setElementTypeFilter(elementTypeFilter === type.toLowerCase() ? 'all' : type.toLowerCase())}
                          title={`Click to filter ${type} elements`}
                        >
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Show duplicate names - RESTORED */}
                  {duplicateNames.length > 0 && !searchText && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="text-xs font-medium text-gray-700">
                        Same Name Elements:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {duplicateNames.slice(0, 8).map(([name, count]) => (
                          <Badge
                            key={name}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => {
                              setSearchText(name)
                              toast.info(`Found ${count} elements named "${name}"`)
                            }}
                          >
                            {name}: {count}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        💡 Click name → Filter → "Keep Only These" → Add to task
                      </div>
                    </div>
                  )}

                  {/* Quick actions for filtered results */}
                  {searchText && filteredElements.length > 0 && filteredElements.length < selectedElements.length && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="text-xs text-gray-600">
                        Found {filteredElements.length} matching "{searchText}"
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => {
                            // Keep only filtered elements
                            setSelectedElements(filteredElements)
                            setSearchText('')
                            toast.success(`Kept only ${filteredElements.length} matching elements`)
                          }}
                        >
                          Keep Only These
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => {
                            // Remove filtered elements
                            const remaining = selectedElements.filter(el => !filteredElements.includes(el))
                            setSelectedElements(remaining)
                            setSearchText('')
                            toast.success(`Removed ${filteredElements.length} matching elements`)
                          }}
                        >
                          Remove These
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Element list with names */}
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-gray-50 rounded border">
                    {filteredElements.length === 0 ? (
                      <div className="text-xs text-center text-gray-500 py-4">
                        No elements match the filter
                      </div>
                    ) : (
                      <>
                        {filteredElements.slice(0, 10).map((el, index) => (
                          <div key={el.id} className="text-xs p-2 bg-white rounded border flex items-center justify-between">
                            <div className="flex-1 truncate">
                              <span className="font-medium">{index + 1}. </span>
                              <span className="text-gray-700">{el.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs ml-2">
                              {el.type}
                            </Badge>
                          </div>
                        ))}
                        {filteredElements.length > 10 && (
                          <div className="text-xs text-center text-gray-500 py-1">
                            +{filteredElements.length - 10} more elements
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t">
                    <Button
                      onClick={handleCreateTask}
                      className="w-full"
                      size="sm"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Task ({selectedElements.length})
                    </Button>
                    <Button
                      onClick={handleClearSelection}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Right Side - 3D Viewer */}
        <div className={canCreateTasks ? "lg:col-span-3" : "lg:col-span-4"}>
          <Card className="h-[600px] overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-sm font-semibold">3D Model Viewer</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)] overflow-hidden">
              <UnifiedModelViewer
                project={project}
                onElementSelect={handleElementSelect}
                selectedElements={selectedElements.map(el => el.id)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      {/* End of Main Content Grid */}

      {/* Gantt Chart - Separate section below grid */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Timeline</CardTitle>
            {tasks.length > 0 && (
              <Badge variant="secondary">{tasks.length} tasks</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <p className="ml-3 text-gray-600">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Tasks Yet</h3>
                <p className="text-gray-600 mb-4">
                  Select elements from the 3D viewer and create your first task!
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                    Not Started
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                    In Progress
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Completed
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <GanttChart tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <CreateTaskFromElementsDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        selectedElements={selectedElements}
        projectId={project.id}
        teams={teams}
        users={users}
        onTaskCreated={handleTaskCreated}
      />

      {/* Update Task Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={(open) => !open && setShowUpdateDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Update Task Progress
              {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <Badge variant="outline" className="text-xs ml-2">Admin/Manager</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Admin/Manager Correction Note */}
            {(currentUserRole === 'admin' || currentUserRole === 'manager') && selectedTask?.assigneeId !== currentUserId && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>⚠️ Correction Mode</strong>
                  <p className="mt-1">You are updating a task assigned to {selectedTask?.assignee?.fullName || 'another user'}. Use this to correct incorrect progress reports.</p>
                </div>
              </div>
            )}
            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={taskStatus} onValueChange={setTaskStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Progress */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Progress: {taskProgress}%
              </label>
              <Slider
                value={[taskProgress]}
                onValueChange={(value) => setTaskProgress(value[0])}
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
                  setTaskProgress(0)
                  setTaskStatus("todo")
                }}
                className="flex-1"
              >
                Not Started
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTaskProgress(50)
                  setTaskStatus("in_progress")
                }}
                className="flex-1"
              >
                50% Done
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTaskProgress(100)
                  setTaskStatus("completed")
                }}
                className="flex-1"
              >
                Complete
              </Button>
            </div>

            {/* Permission Warning for Viewer/Member */}
            {selectedTask && (currentUserRole === 'viewer' || currentUserRole === 'member') && selectedTask.assigneeId !== currentUserId && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">
                  <strong>⚠️ Access Denied</strong>
                  <p className="mt-1">You can only update tasks assigned to you. This task is assigned to {selectedTask.assignee?.fullName || 'someone else'}.</p>
                </div>
              </div>
            )}

            {/* Task Info */}
            {selectedTask && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assignee:</span>
                  <span className="font-medium">{selectedTask.assignee?.fullName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Team:</span>
                  <span className="font-medium">{selectedTask.team?.name || 'No team'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Elements:</span>
                  <span className="font-medium">{selectedTask.elementLinks?.length || 0} linked</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateDialog(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTask}
              disabled={
                updating || 
                ((currentUserRole === 'viewer' || currentUserRole === 'member') && 
                 selectedTask?.assigneeId !== currentUserId)
              }
            >
              {updating ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
