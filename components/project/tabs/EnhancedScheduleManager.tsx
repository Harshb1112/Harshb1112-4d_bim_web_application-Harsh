/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Box, 
  Filter, 
  MousePointer, 
  Square, 
  Lasso, 
  Layers,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Upload,
  List,
  Target,
  Calendar,
  BarChart3,
  AlertTriangle,
  Bot
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import AITaskGenerator from '../AITaskGenerator'
import { CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import GanttChart from '../GanttChart'
import UnifiedModelViewer from '../UnifiedModelViewer'
import CreateTaskFromElementsDialog from '../CreateTaskFromElementsDialog'
import EditTaskDialog from '../EditTaskDialog'

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
  const [multiSelectIds, setMultiSelectIds] = useState<Set<string>>(new Set()) // For Ctrl+Click multi-select

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [taskProgress, setTaskProgress] = useState<number>(0)
  const [taskStatus, setTaskStatus] = useState<string>('todo')
  const [taskStartDate, setTaskStartDate] = useState<string>('')
  const [taskEndDate, setTaskEndDate] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [availableElements, setAvailableElements] = useState<any[]>([])
  
  // Schedule tab state
  const [scheduleTab, setScheduleTab] = useState('gantt')

  // Teams and users for task creation
  const [teams, setTeams] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    fetchTasks()
  }, [project.id])

  // Only fetch teams and users when dialog opens
  useEffect(() => {
    if ((showCreateDialog || showEditDialog) && teams.length === 0) {
      fetchTeams()
    }
    if ((showCreateDialog || showEditDialog) && users.length === 0) {
      fetchUsers()
    }
  }, [showCreateDialog, showEditDialog])

  // Fetch available elements when edit dialog opens
  useEffect(() => {
    if (showEditDialog && project.id) {
      fetchAvailableElements()
    }
  }, [showEditDialog, project.id])

  const fetchAvailableElements = async () => {
    try {
      // Fetch all elements from project models (from database)
      const response = await fetch(`/api/models/elements?projectId=${project.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.elements && data.elements.length > 0) {
          console.log(`Fetched ${data.elements.length} elements from database`)
          setAvailableElements(data.elements)
        } else {
          console.warn('No elements found in database for this project')
          setAvailableElements([])
        }
      } else {
        console.error('Failed to fetch elements:', response.status)
        setAvailableElements([])
      }
    } catch (error) {
      console.error('Error fetching elements:', error)
      setAvailableElements([])
    }
  }

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

  // Auto-isolate selected elements in viewer when selection changes
  useEffect(() => {
    if (selectedElements.length === 0) {
      // If no elements selected, show all
      const timer = setTimeout(() => {
        try {
          // Autodesk Viewer
          const autodeskViewer = (window as any).autodeskViewer
          if (autodeskViewer && autodeskViewer.model) {
            // Check if viewer is properly initialized
            if (autodeskViewer.model.visibilityManager) {
              autodeskViewer.showAll()
              autodeskViewer.clearThemingColors(autodeskViewer.model)
              autodeskViewer.setGhosting(true)
              console.log('[Auto-isolate] ✅ Autodesk: Showing all elements')
            } else {
              console.log('[Auto-isolate] ⚠️ Autodesk viewer not fully initialized yet')
            }
          }
          
          // IFC Viewer
          const ifcViewer = (window as any).ifcViewer
          if (ifcViewer?.IFC) {
            // Show all IFC elements
            const allIDs = ifcViewer.IFC.loader.ifcManager.getAllItemsOfType(0, ifcViewer.IFC.IFCPRODUCT, false)
            if (allIDs?.length > 0) {
              ifcViewer.IFC.loader.ifcManager.showItems(0, allIDs)
              console.log('[Auto-isolate] ✅ IFC: Showing all elements')
            }
          }
          
          // Speckle Viewer
          const speckleViewer = (window as any).speckleViewer
          if (speckleViewer?.scene) {
            speckleViewer.scene.traverse((obj: any) => {
              if (obj.visible !== undefined) obj.visible = true
            })
            console.log('[Auto-isolate] ✅ Speckle: Showing all elements')
          }
        } catch (error) {
          console.error('[Auto-isolate] Error clearing:', error)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
    
    // Debounce to avoid too many updates
    const timer = setTimeout(() => {
      try {
        console.log('[Auto-isolate] 🔄 Starting auto-isolate for', selectedElements.length, 'elements')
        
        // Try Autodesk Viewer
        const Autodesk = (window as any).Autodesk
        const autodeskViewer = (window as any).autodeskViewer
        
        if (autodeskViewer && Autodesk && autodeskViewer.model) {
          // Parse element IDs to dbIds
          const selectedDbIds = selectedElements
            .map(el => {
              if (typeof el.id === 'number') return el.id
              const parsed = parseInt(String(el.id))
              if (!isNaN(parsed)) return parsed
              if (String(el.id).startsWith('IFC_')) {
                const id = parseInt(String(el.id).replace('IFC_', ''))
                if (!isNaN(id)) return id
              }
              return null
            })
            .filter(id => id !== null) as number[]
          
          if (selectedDbIds.length > 0) {
            console.log('[Auto-isolate] 📊 Autodesk: Processing', selectedDbIds.length, 'elements')
            
            // Check if viewer is properly initialized
            if (!autodeskViewer.model?.visibilityManager) {
              console.log('[Auto-isolate] ⚠️ Autodesk viewer not fully initialized yet')
              return
            }
            
            // Get ALL dbIds in the model
            const instanceTree = autodeskViewer.model.getInstanceTree()
            const allDbIds: number[] = []
            instanceTree.enumNodeChildren(instanceTree.getRootId(), (dbId: number) => {
              allDbIds.push(dbId)
            }, true)
            
            // Find elements to HIDE
            const selectedSet = new Set(selectedDbIds)
            const toHide = allDbIds.filter(id => !selectedSet.has(id))
            
            console.log('[Auto-isolate] 🎯 Autodesk: Show', selectedDbIds.length, '| Hide', toHide.length)
            
            // Disable ghosting for complete removal
            autodeskViewer.setGhosting(false)
            
            // Show all, then hide non-selected
            autodeskViewer.showAll()
            autodeskViewer.hide(toHide)
            autodeskViewer.show(selectedDbIds)
            
            // Fit view
            setTimeout(() => autodeskViewer.fitToView(selectedDbIds), 100)
            
            // Highlight
            const THREE = Autodesk.Viewing.Private.THREE
            if (THREE?.Color) {
              const color = new THREE.Color(0.2, 0.6, 1.0)
              selectedDbIds.forEach((dbId: number) => {
                autodeskViewer.setThemingColor(dbId, color, autodeskViewer.model, true)
              })
            }
            
            console.log('[Auto-isolate] ✅ Autodesk: SUCCESS (NO GHOST!)')
            return
          }
        }
        
        // Try IFC Viewer
        const ifcViewer = (window as any).ifcViewer
        if (ifcViewer?.IFC) {
          const selectedExpressIDs = selectedElements
            .map(el => {
              if (String(el.id).startsWith('IFC_')) {
                const id = parseInt(String(el.id).replace('IFC_', ''))
                if (!isNaN(id)) return id
              }
              if (typeof el.id === 'number') return el.id
              const parsed = parseInt(String(el.id))
              if (!isNaN(parsed)) return parsed
              return null
            })
            .filter(id => id !== null) as number[]
          
          if (selectedExpressIDs.length > 0) {
            console.log('[Auto-isolate] 📊 IFC: Processing', selectedExpressIDs.length, 'elements')
            
            // Get all IFC elements
            const allIDs = ifcViewer.IFC.loader.ifcManager.getAllItemsOfType(0, ifcViewer.IFC.IFCPRODUCT, false)
            
            if (allIDs?.length > 0) {
              // Hide all first
              ifcViewer.IFC.loader.ifcManager.hideItems(0, allIDs)
              
              // Show only selected
              ifcViewer.IFC.loader.ifcManager.showItems(0, selectedExpressIDs)
              
              console.log('[Auto-isolate] ✅ IFC: SUCCESS! Showing', selectedExpressIDs.length, 'elements')
              return
            }
          }
        }
        
        // Try Speckle Viewer
        const speckleViewer = (window as any).speckleViewer
        if (speckleViewer?.scene) {
          const selectedIds = selectedElements.map(el => String(el.id))
          const selectedSet = new Set(selectedIds)
          
          console.log('[Auto-isolate] 📊 Speckle: Processing', selectedIds.length, 'elements')
          
          let hiddenCount = 0
          let shownCount = 0
          
          speckleViewer.scene.traverse((obj: any) => {
            if (obj.userData?.id || obj.userData?.speckleId) {
              const objId = String(obj.userData.id || obj.userData.speckleId)
              
              if (selectedSet.has(objId)) {
                obj.visible = true
                shownCount++
              } else {
                obj.visible = false
                hiddenCount++
              }
            }
          })
          
          console.log('[Auto-isolate] ✅ Speckle: SUCCESS! Shown', shownCount, '| Hidden', hiddenCount)
          return
        }
        
        console.log('[Auto-isolate] ⚠️ No compatible viewer found')
        
      } catch (error) {
        console.error('[Auto-isolate] ❌ Error:', error)
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [selectedElements])

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
      // Check if element already exists
      const exists = prev.find(el => el.id === elementId)
      
      if (selectionMode === 'single') {
        // Single mode: Only show toast if it's a different element
        if (!exists || prev.length !== 1) {
          toast.info(`Selected: ${newElement.name}`, { duration: 2000 })
        }
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
        if (exists) {
          // Don't show toast for already selected - reduces noise
          return prev
        } else {
          // Only show toast every 5 elements to reduce spam
          if ((prev.length + 1) % 5 === 0) {
            toast.info(`⚡ ${prev.length + 1} elements selected`, { duration: 1500 })
          }
          return [...prev, newElement]
        }
      } else {
        // Multi/box mode: Toggle on/off (like Ctrl+Click)
        if (exists) {
          // Removed - show brief toast
          toast.info(`❌ Removed`, { duration: 1500 })
          return prev.filter(el => el.id !== elementId)
        } else {
          // Added - show brief toast
          toast.info(`✅ Added (${prev.length + 1} total)`, { duration: 1500 })
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
    
    // Set task data
    setSelectedTask(task)
    setTaskProgress(Number(task.progress || 0))
    setTaskStatus(task.status || 'todo')
    // Set dates - format for input type="date"
    setTaskStartDate(task.startDate ? task.startDate.split('T')[0] : '')
    setTaskEndDate(task.endDate ? task.endDate.split('T')[0] : '')
    setShowUpdateDialog(true)
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

  const handleDeleteTask = async () => {
    if (!selectedTask) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('Task deleted successfully!')
        await fetchTasks()
        setShowDeleteDialog(false)
        setShowUpdateDialog(false)
        setSelectedTask(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete task')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Error deleting task')
    } finally {
      setDeleting(false)
    }
  }

  // Filter elements ONLY by search text (NOT by type filter)
  // The type filter is used to LOAD elements, not to hide them after loading
  const filteredElements = selectedElements.filter(el => {
    // Only filter by search text
    const searchLower = searchText.trim().toLowerCase()
    const elementName = (el.name || '').toLowerCase()
    const elementType = (el.type || '').toLowerCase()
    const elementId = (el.id || '').toLowerCase()
    
    const searchMatch = searchLower === '' || 
                       elementName.includes(searchLower) ||
                       elementType.includes(searchLower) ||
                       elementId.includes(searchLower)
    
    return searchMatch
  })

  // Count elements by type from SELECTED elements
  const elementCounts = selectedElements.reduce((acc, el) => {
    const type = el.type || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Store ALL available types from model (for dropdown)
  const [allAvailableTypes, setAllAvailableTypes] = useState<Record<string, number>>({})
  
  // Load all available types from model IMMEDIATELY when viewer is ready
  useEffect(() => {
    const loadAvailableTypes = async () => {
      try {
        // Check if viewer is loaded
        const viewer = (window as any).autodeskViewer
        if (!viewer) {
          console.log('[Available Types] Viewer not ready yet, will retry...')
          return
        }
        
        console.log('[Available Types] Loading types from viewer...')
        const { readElementsFromLoadedViewer } = await import('@/lib/universal-viewer-element-reader')
        const allElements = await readElementsFromLoadedViewer()
        
        if (allElements.length > 0) {
          const typeCounts = allElements.reduce((acc, el) => {
            const type = el.type || 'Unknown'
            acc[type] = (acc[type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          setAllAvailableTypes(typeCounts)
          console.log('[Available Types] ✅ Loaded', Object.keys(typeCounts).length, 'types:', Object.keys(typeCounts))
        } else {
          console.log('[Available Types] No elements found, will retry...')
        }
      } catch (error) {
        console.error('[Available Types] Error:', error)
      }
    }
    
    // Try multiple times with increasing delays
    const timers = [
      setTimeout(loadAvailableTypes, 1000),  // Try after 1s
      setTimeout(loadAvailableTypes, 3000),  // Try after 3s
      setTimeout(loadAvailableTypes, 5000),  // Try after 5s
    ]
    
    return () => timers.forEach(t => clearTimeout(t))
  }, [project.id])

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

  // Import schedule handler
  const handleImportSchedule = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    console.log('[Import] Starting import:', { fileName: file.name, fileSize: file.size, projectId: project.id })
    
    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', project.id.toString())
    
    try {
      const res = await fetch('/api/tasks/import', { method: 'POST', credentials: 'include', body: formData })
      const data = await res.json()
      
      console.log('[Import] Response:', { ok: res.ok, status: res.status, data })
      
      if (res.ok) {
        toast.success(`Imported ${data.count || 0} tasks!`)
        fetchTasks()
        setShowImportDialog(false)
      } else {
        const errorMsg = data.error || 'Import failed'
        console.error('[Import] Error:', errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('[Import] Exception:', error)
      toast.error('Import failed: ' + String(error))
    } finally { 
      setImporting(false)
      e.target.value = '' 
    }
  }

  // Calculate critical path (simplified - tasks with no slack)
  const criticalPathTasks = tasks.filter(t => {
    const hasDependent = tasks.some(other => other.dependencies?.some((d: any) => d.dependsOnId === t.id))
    return t.status !== 'completed' && (hasDependent || !t.endDate)
  })

  // Format date helper
  const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString() : '-'

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Project Schedule</h2>
          <p className="text-sm text-muted-foreground">Select BIM elements and create tasks</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateTasks && (
            <>
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />Import Schedule
                </Button>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import Schedule</DialogTitle>
                    <DialogDescription>Upload MS Project (.xml) or Primavera P6 (.xml, .xer) schedule file</DialogDescription>
                  </DialogHeader>
                  <div className="py-6">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm font-medium mb-2">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">Supported: MS Project XML, Primavera P6 XML, Primavera XER</p>
                      <Input 
                        type="file" 
                        accept=".xml,.xer,.xlsx,.xls,.csv,.mpp" 
                        onChange={handleImportSchedule} 
                        disabled={importing} 
                        className="max-w-xs mx-auto mt-4 cursor-pointer" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
                    <Button disabled={importing} className="bg-orange-400 hover:bg-orange-500">
                      {importing ? 'Importing...' : `Import ${tasks.length} Tasks`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => setScheduleTab('4dbim')}>
                <Box className="h-4 w-4 mr-2" />Add Tasks from Model
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-orange-500 hover:bg-orange-600">
                <PlusCircle className="h-4 w-4 mr-2" />Add Task
              </Button>
            </>
          )}
          <Button onClick={fetchTasks} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Schedule Tabs */}
      <Tabs value={scheduleTab} onValueChange={setScheduleTab} className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="gantt" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />Gantt Chart
          </TabsTrigger>
          <TabsTrigger value="4dbim">
            <Box className="h-4 w-4 mr-2" />4D BIM
          </TabsTrigger>
          <TabsTrigger value="aitasks">
            <Bot className="h-4 w-4 mr-2" />🤖 AI Tasks
          </TabsTrigger>
          <TabsTrigger value="tasklist">
            <List className="h-4 w-4 mr-2" />Task List
          </TabsTrigger>
          <TabsTrigger value="critical">
            <AlertTriangle className="h-4 w-4 mr-2" />Critical Path
          </TabsTrigger>
          <TabsTrigger value="baselines">
            <Target className="h-4 w-4 mr-2" />Baselines
          </TabsTrigger>
        </TabsList>

        {/* GANTT CHART TAB */}
        <TabsContent value="gantt">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Project Timeline</CardTitle>
                <Badge variant="secondary">{tasks.length} tasks</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks yet. Create tasks from 4D BIM tab or import a schedule.</p>
                </div>
              ) : (
                <GanttChart tasks={tasks} onTaskClick={handleTaskClick} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI TASKS TAB */}
        <TabsContent value="aitasks">
          <Card className="border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Bot className="h-5 w-5" />
                🤖 AI Task Generator
              </CardTitle>
              <CardDescription>
                Generate tasks automatically using AI - describe your project needs in natural language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AITaskGenerator 
                projectId={project.id} 
                onTasksGenerated={(newTasks) => {
                  console.log(`🤖 AI generated ${newTasks.length} tasks successfully!`)
                  toast.success(`✨ ${newTasks.length} tasks generated! Refreshing...`)
                  window.location.reload()
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASK LIST TAB */}
        <TabsContent value="tasklist">
          <Card>
            <CardHeader>
              <CardTitle>Task List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Elements</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tasks</TableCell></TableRow>
                  ) : tasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.name}</TableCell>
                      <TableCell>
                        <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'} 
                          className={task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500 text-white' : ''}>
                          {(task.status || 'todo').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={task.progress || 0} className="w-16 h-2" />
                          <span className="text-xs">{task.progress || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(task.startDate)}</TableCell>
                      <TableCell>{formatDate(task.endDate)}</TableCell>
                      <TableCell>{task.assignee?.fullName || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{task.elementLinks?.length || 0}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleTaskClick(task)}>Progress</Button>
                        {canCreateTasks && (
                          <>
                            <Button variant="ghost" size="sm" className="text-blue-500" onClick={() => { setSelectedTask(task); setShowEditDialog(true) }}>Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setSelectedTask(task); setShowDeleteDialog(true) }}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRITICAL PATH TAB */}
        <TabsContent value="critical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Critical Path Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {criticalPathTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No critical tasks! All tasks are on track.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    {criticalPathTasks.length} tasks on critical path - delays here will affect project completion
                  </p>
                  {criticalPathTasks.map((task, idx) => (
                    <div key={task.id} className="flex items-center gap-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium">{task.name}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(task.startDate)} → {formatDate(task.endDate)}</p>
                      </div>
                      <Badge variant="outline" className="border-red-300">{task.progress || 0}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BASELINES TAB */}
        <TabsContent value="baselines">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Baselines</CardTitle>
                {canCreateTasks && <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />Save Baseline</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No baselines saved yet.</p>
                <p className="text-sm mt-2">Save a baseline to track schedule changes over time.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4D BIM TAB */}
        <TabsContent value="4dbim">
          {/* Role Info Banner */}
          {!canCreateTasks && (
            <Card className="bg-blue-50 border-blue-200 mb-4">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  <strong>View Only:</strong> You can view but not create tasks. Contact Admin/Manager for task creation.
                </p>
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
                    handleClearSelection()
                    toast.info('👆 Single Mode: Each click replaces selection', { duration: 3000 })
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
                    toast.info('📦 Multi Mode: Click to add/remove (toggle)', { duration: 3000 })
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
                    toast.info('⚡ Lasso Mode: Rapid add (no remove)', { duration: 3000 })
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
                    toast.info('📚 Layer Mode: Group by type', { duration: 3000 })
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
                  placeholder="Type to search... (e.g., IFC_128906)"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && searchText && selectedElements.length === 0) {
                      // If Enter pressed and no elements selected, try to load from model
                      try {
                        const response = await fetch(`/api/projects/${project.id}/models`)
                        if (response.ok) {
                          const data = await response.json()
                          const models = data.models || []
                          
                          if (models.length > 0) {
                            const model = models[0]
                            const elemResponse = await fetch(`/api/models/${model.id}/elements`)
                            if (elemResponse.ok) {
                              const elemData = await elemResponse.json()
                              if (elemData.elements && elemData.elements.length > 0) {
                                // Filter elements by search text
                                const matching = elemData.elements.filter((el: any) => 
                                  el.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                                  el.id?.toString().toLowerCase().includes(searchText.toLowerCase()) ||
                                  el.guid?.toLowerCase().includes(searchText.toLowerCase())
                                )
                                
                                if (matching.length > 0) {
                                  setSelectedElements(matching.map((el: any) => ({
                                    id: el.id?.toString() || el.guid || el.expressID?.toString() || 'unknown',
                                    type: el.type || el.category || 'Element',
                                    name: el.name || `Element_${el.id?.toString().slice(0, 8) || 'unknown'}`,
                                    properties: el.properties || el
                                  })))
                                  toast.success(`Found ${matching.length} matching elements`)
                                } else {
                                  toast.info('No matching elements found')
                                }
                              }
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error searching elements:', error)
                      }
                    }
                  }}
                  className="h-8 text-sm"
                />
                {searchText && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setSearchText('')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear search
                    </button>
                    {selectedElements.length === 0 && (
                      <button
                        onClick={async () => {
                          try {
                            toast.info('Searching in loaded 3D viewer...')
                            
                            // Read elements from whatever viewer is loaded
                            const { readElementsFromLoadedViewer } = await import('@/lib/universal-viewer-element-reader')
                            const allElements = await readElementsFromLoadedViewer()
                            
                            console.log('[Search] Total elements in viewer:', allElements.length)
                            
                            if (allElements.length === 0) {
                              toast.error('No 3D model loaded in viewer. Please wait for model to load.')
                              return
                            }
                            
                            // Filter by search text
                            const searchLower = searchText.toLowerCase()
                            const matching = allElements.filter((el: any) => {
                              const nameMatch = el.name?.toLowerCase().includes(searchLower)
                              const idMatch = el.id?.toString().toLowerCase().includes(searchLower)
                              const guidMatch = el.guid?.toLowerCase().includes(searchLower)
                              return nameMatch || idMatch || guidMatch
                            })
                            
                            console.log('[Search] Matching elements:', matching.length)
                            
                            if (matching.length > 0) {
                              setSelectedElements(matching.map((el: any) => ({
                                id: el.id?.toString() || el.guid || 'unknown',
                                type: el.type || 'Element',
                                name: el.name || `Element_${el.id}`,
                                properties: el
                              })))
                              toast.success(`Found ${matching.length} matching "${searchText}"`)
                            } else {
                              toast.error(`No elements matching "${searchText}" found in loaded model`)
                            }
                            
                          } catch (error: any) {
                            console.error('[Search] Error:', error)
                            toast.error('Search failed: ' + error.message)
                          }
                        }}
                        className="text-xs text-green-600 hover:underline font-medium"
                      >
                        🔍 Search in Model
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Quick filter by type */}
              <div>
                <Label className="text-xs text-gray-600 mb-1">Quick Filter (Click type to load only those)</Label>
                <Select value={elementTypeFilter} onValueChange={async (value) => {
                  console.log('[Quick Filter] Selected type:', value)
                  
                  // If "all" is selected, just reset filter (don't clear selection)
                  if (value === 'all') {
                    setElementTypeFilter('all')
                    console.log('[Quick Filter] Reset to show all types')
                    return
                  }
                  
                  // Set the filter value
                  setElementTypeFilter(value)
                  
                  // When a type is selected, LOAD elements of that type from the model
                  try {
                    toast.info(`Loading ${value} elements from model...`)
                    
                    const { readElementsFromLoadedViewer } = await import('@/lib/universal-viewer-element-reader')
                    const allElements = await readElementsFromLoadedViewer()
                    
                    console.log('[Quick Filter] Total elements in viewer:', allElements.length)
                    
                    if (allElements.length > 0) {
                      const matching = allElements.filter((el: any) => 
                        el.type?.toLowerCase() === value.toLowerCase()
                      )
                      
                      console.log('[Quick Filter] Matching elements:', matching.length)
                      
                      if (matching.length > 0) {
                        // REPLACE selection with elements of this type
                        setSelectedElements(matching.map((el: any) => ({
                          id: el.id?.toString() || el.guid || 'unknown',
                          type: el.type || 'Element',
                          name: el.name || `Element_${el.id}`,
                          properties: el
                        })))
                        toast.success(`Loaded ${matching.length} ${value} elements`)
                      } else {
                        toast.info(`No ${value} elements found in model`)
                      }
                    } else {
                      toast.error('No 3D model loaded. Please wait for viewer to load.')
                    }
                  } catch (error: any) {
                    console.error('[Quick Filter] Error:', error)
                    toast.error('Failed to load elements')
                  }
                }}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Types ({Object.values(allAvailableTypes).reduce((sum, count) => sum + count, 0) || selectedElements.length} total)
                    </SelectItem>
                    {/* Show ALL available types from model, not just selected ones */}
                    {Object.entries(allAvailableTypes).length > 0 ? (
                      Object.entries(allAvailableTypes)
                        .sort((a, b) => b[1] - a[1]) // Sort by count descending
                        .map(([type, totalCount]) => {
                          const selectedCount = elementCounts[type] || 0
                          return (
                            <SelectItem key={type} value={type.toLowerCase()}>
                              {type} ({totalCount} in model{selectedCount > 0 ? `, ${selectedCount} selected` : ''})
                            </SelectItem>
                          )
                        })
                    ) : (
                      // Fallback: show types from selected elements if model types not loaded yet
                      Object.entries(elementCounts).map(([type, count]) => (
                        <SelectItem key={type} value={type.toLowerCase()}>
                          {type} ({count})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {elementTypeFilter !== 'all' && (
                  <div className="text-xs mt-2 space-y-2">
                    <div className="flex items-center justify-between text-blue-600">
                      <span>✓ Showing {selectedElements.length} {elementTypeFilter} elements</span>
                      <button
                        onClick={() => setElementTypeFilter('all')}
                        className="text-red-500 hover:underline"
                      >
                        Clear filter
                      </button>
                    </div>
                  </div>
                )}
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
                <div className="text-center py-4 text-sm text-gray-500 space-y-3">
                  <Box className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No elements selected</p>
                  <p className="text-xs mt-1">Click elements in 3D viewer or load from model</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        toast.info('Loading elements from viewer...')
                        
                        // Use universal reader for all model types
                        const { readElementsFromLoadedViewer } = await import('@/lib/universal-viewer-element-reader')
                        const elements = await readElementsFromLoadedViewer()
                        
                        if (elements.length > 0) {
                          // Calculate type counts for dropdown
                          const typeCounts = elements.reduce((acc, el) => {
                            const type = el.type || 'Unknown'
                            acc[type] = (acc[type] || 0) + 1
                            return acc
                          }, {} as Record<string, number>)
                          
                          setAllAvailableTypes(typeCounts)
                          console.log('[Load All] Loaded', Object.keys(typeCounts).length, 'types')
                          
                          setSelectedElements(elements.map((el: any) => ({
                            id: el.id?.toString() || el.guid || 'unknown',
                            type: el.type || 'Element',
                            name: el.name || `Element_${el.id}`,
                            properties: el
                          })))
                          toast.success(`Loaded ${elements.length} elements from viewer`)
                        } else {
                          toast.error('No 3D model loaded in viewer. Please wait for model to load.')
                        }
                        
                      } catch (error: any) {
                        console.error('Error loading elements:', error)
                        toast.error('Failed to load elements: ' + error.message)
                      }
                    }}
                    className="mt-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Load All Elements from Model
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {searchText === '' ? (
                        <>{selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected</>
                      ) : (
                        <>
                          {filteredElements.length} of {selectedElements.length} elements
                          {searchText && <span className="text-blue-600"> (search: "{searchText}")</span>}
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
                    <div className="text-xs text-gray-500">
                      💡 Click to filter | Ctrl+Click to remove filtered ones
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(elementCounts).map(([type, count]) => (
                        <Badge 
                          key={type} 
                          variant={elementTypeFilter === 'all' || elementTypeFilter === type.toLowerCase() ? 'default' : 'secondary'} 
                          className="text-xs cursor-pointer hover:opacity-80 transition-all"
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              // Ctrl+Click: Remove only the FILTERED/VISIBLE elements of this type
                              const toRemove = filteredElements.filter(el => el.type === type)
                              const remaining = selectedElements.filter(el => !toRemove.some(r => r.id === el.id))
                              setSelectedElements(remaining)
                              toast.success(`Removed ${toRemove.length} visible ${type} elements`)
                            } else {
                              // Normal click: Filter
                              setElementTypeFilter(elementTypeFilter === type.toLowerCase() ? 'all' : type.toLowerCase())
                            }
                          }}
                          title={`Click to filter | Ctrl+Click to remove visible ${type}`}
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
                      <div className="text-xs text-gray-500 mb-1">
                        💡 Click to select all | Ctrl+Click to remove visible ones
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {duplicateNames.slice(0, 8).map(([name, count]) => (
                          <Badge
                            key={name}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={async (e) => {
                              if (e.ctrlKey || e.metaKey) {
                                // Ctrl+Click: Remove only the FILTERED/VISIBLE elements with this name
                                const toRemove = filteredElements.filter(el => el.name === name)
                                const remaining = selectedElements.filter(el => !toRemove.some(r => r.id === el.id))
                                setSelectedElements(remaining)
                                toast.success(`Removed ${toRemove.length} visible "${name}" elements`)
                                return
                              }
                              
                              // Normal click: Load all elements with this name from model
                              try {
                                toast.info(`Loading all "${name}" elements...`)
                                const response = await fetch(`/api/projects/${project.id}/models`)
                                
                                if (response.ok) {
                                  const data = await response.json()
                                  const models = data.models || []
                                  
                                  if (models.length > 0) {
                                    const model = models[0]
                                    const elemResponse = await fetch(`/api/models/${model.id}/elements`)
                                    
                                    if (elemResponse.ok) {
                                      const elemData = await elemResponse.json()
                                      
                                      if (elemData.elements && elemData.elements.length > 0) {
                                        // Find all elements with this exact name
                                        const matching = elemData.elements.filter((el: any) => 
                                          el.name === name
                                        )
                                        
                                        if (matching.length > 0) {
                                          // Add to existing selection (don't replace)
                                          const newElements = matching.map((el: any) => ({
                                            id: el.id?.toString() || el.guid || el.expressID?.toString() || 'unknown',
                                            type: el.type || el.category || 'Element',
                                            name: el.name || `Element_${el.id?.toString().slice(0, 8) || 'unknown'}`,
                                            properties: el.properties || el
                                          }))
                                          
                                          // Merge with existing, avoid duplicates by id
                                          setSelectedElements(prev => {
                                            const existingIds = new Set(prev.map(e => e.id))
                                            const toAdd = newElements.filter(e => !existingIds.has(e.id))
                                            return [...prev, ...toAdd]
                                          })
                                          
                                          toast.success(`Added ${matching.length} elements named "${name}"`)
                                        }
                                      }
                                    }
                                  }
                                }
                              } catch (error) {
                                console.error('Error loading duplicate elements:', error)
                                toast.error('Failed to load elements')
                              }
                            }}
                          >
                            {name}: {count}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        💡 Click name badge → Loads all elements with that name from model
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

                  {/* Element list with names - Show ALL elements with scroll */}
                  <div className="space-y-2">
                    {multiSelectIds.size > 0 && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                        <span className="text-xs font-medium text-blue-700">
                          {multiSelectIds.size} selected for removal
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => setMultiSelectIds(new Set())}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-xs bg-red-500 hover:bg-red-600"
                            onClick={() => {
                              const remaining = selectedElements.filter(el => !multiSelectIds.has(el.id))
                              setSelectedElements(remaining)
                              toast.success(`Removed ${multiSelectIds.size} elements`)
                              setMultiSelectIds(new Set())
                            }}
                          >
                            Remove Selected
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="max-h-96 overflow-y-auto space-y-1 p-2 bg-gray-50 rounded border">
                      {filteredElements.length === 0 ? (
                        <div className="text-xs text-center text-gray-500 py-4">
                          No elements match the filter
                        </div>
                      ) : (
                        <>
                          {filteredElements.map((el, index) => {
                            const isMultiSelected = multiSelectIds.has(el.id)
                            return (
                              <div 
                                key={`${el.id}-${index}`} 
                                className={`text-xs p-2 rounded border flex items-center justify-between transition-colors group cursor-pointer ${
                                  isMultiSelected 
                                    ? 'bg-blue-100 border-blue-300' 
                                    : 'bg-white hover:bg-blue-50'
                                }`}
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey) {
                                    // Ctrl+Click: Toggle multi-select
                                    setMultiSelectIds(prev => {
                                      const newSet = new Set(prev)
                                      if (newSet.has(el.id)) {
                                        newSet.delete(el.id)
                                      } else {
                                        newSet.add(el.id)
                                      }
                                      return newSet
                                    })
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2 flex-1 truncate">
                                  {isMultiSelected && (
                                    <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                  <span className="font-medium">{index + 1}. </span>
                                  <span className="text-gray-700 truncate">{el.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {el.type}
                                  </Badge>
                                  {/* Remove single element button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedElements(prev => prev.filter(e => e.id !== el.id))
                                      toast.success(`Removed: ${el.name}`)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1"
                                    title="Remove this element"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">3D Model Viewer</CardTitle>
                {selectedElements.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          toast.info(`Highlighting ${selectedElements.length} elements in viewer...`)
                          
                          // Get the viewer instance
                          const Autodesk = (window as any).Autodesk
                          const viewer = (window as any).autodeskViewer
                          
                          if (viewer && Autodesk) {
                            // Get dbIds from element IDs
                            const dbIds = selectedElements
                              .map(el => parseInt(el.id))
                              .filter(id => !isNaN(id))
                            
                            if (dbIds.length > 0) {
                              // Isolate and highlight
                              viewer.isolate(dbIds)
                              viewer.fitToView(dbIds)
                              
                              // Apply blue highlight color
                              const THREE = Autodesk.Viewing.Private.THREE
                              if (THREE?.Color) {
                                const highlightColor = new THREE.Color(0.2, 0.6, 1.0)
                                dbIds.forEach((dbId: number) => {
                                  viewer.setThemingColor(dbId, highlightColor, viewer.model, true)
                                })
                              }
                              
                              toast.success(`✅ Highlighted ${dbIds.length} elements`)
                            } else {
                              toast.error('Could not find elements in viewer')
                            }
                          } else {
                            toast.error('3D viewer not ready. Please wait for model to load.')
                          }
                        } catch (error: any) {
                          console.error('Error highlighting elements:', error)
                          toast.error('Failed to highlight elements')
                        }
                      }}
                      className="text-xs h-7"
                    >
                      👁️ Show in 3D ({selectedElements.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.info(
                          <div className="space-y-2">
                            <div className="font-semibold">Multi-Select Tips:</div>
                            <div>• <strong>Ctrl + Click</strong> - Add/remove elements</div>
                            <div>• <strong>Shift + Drag</strong> - Box select (if available)</div>
                            <div>• <strong>Click element</strong> - Single select</div>
                          </div>,
                          { duration: 6000 }
                        )
                      }}
                      className="text-xs h-7"
                    >
                      🎯 Selection Help
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const viewer = (window as any).autodeskViewer
                          if (viewer) {
                            viewer.isolate([]) // Show all
                            viewer.clearThemingColors(viewer.model)
                            viewer.fitToView()
                            toast.success('Reset viewer')
                          }
                        } catch (error) {
                          console.error('Error resetting viewer:', error)
                        }
                      }}
                      className="text-xs h-7"
                    >
                      🔄 Reset View
                    </Button>
                  </div>
                )}
              </div>
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
        </TabsContent>
      </Tabs>
      {/* End of Schedule Tabs */}

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

      {/* Edit Task Dialog - For editing dates and elements */}
      {selectedTask && (
        <EditTaskDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          task={selectedTask}
          projectId={project.id}
          availableElements={availableElements}
          teams={teams}
          users={users}
          onTaskUpdated={() => {
            fetchTasks()
            setShowEditDialog(false)
            setSelectedTask(null)
          }}
        />
      )}

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

          <DialogFooter className="flex justify-between sm:justify-between">
            {/* Delete Button - Only for Admin/Manager */}
            {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={updating}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2">
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Task
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800">{selectedTask?.name}</p>
              <div className="mt-2 text-sm text-red-600 space-y-1">
                <p>• All progress data will be lost</p>
                <p>• {selectedTask?.elementLinks?.length || 0} element links will be removed</p>
                <p>• This task will be removed from timeline</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
