'use client'

import { useState, useRef, useCallback } from 'react'
import SpeckleViewer, { SpeckleViewerRef } from './SpeckleViewer'
import ElementSelectionToolbar, { SelectionMode } from './ElementSelectionToolbar'
import CreateTaskFromElementsDialog from './CreateTaskFromElementsDialog'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

interface EnhancedSpeckleViewerProps {
  project: any
  tasks?: any[]
  teams?: Array<{ id: number; name: string }>
  users?: Array<{ id: number; fullName: string; role: string }>
  onTaskCreated?: () => void
}

export default function EnhancedSpeckleViewer({
  project,
  tasks = [],
  teams = [],
  users = [],
  onTaskCreated
}: EnhancedSpeckleViewerProps) {
  const viewerRef = useRef<SpeckleViewerRef>(null)
  const [selectedElements, setSelectedElements] = useState<Array<{
    id: string
    type?: string
    name?: string
    properties?: any
  }>>([])
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [loadedElements, setLoadedElements] = useState<any[]>([])

  const handleElementSelect = useCallback((elementId: string, element: any) => {
    const newElement = {
      id: elementId,
      type: element.type || element.speckle_type || 'Unknown',
      name: element.name || `Element ${elementId.slice(0, 8)}`,
      properties: element.userData || element
    }

    setSelectedElements(prev => {
      if (selectionMode === 'single') {
        // Single selection mode - replace
        return [newElement]
      } else {
        // Multi-selection modes - toggle
        const exists = prev.find(el => el.id === elementId)
        if (exists) {
          return prev.filter(el => el.id !== elementId)
        } else {
          return [...prev, newElement]
        }
      }
    })

    toast.info(`Element ${selectionMode === 'single' ? 'selected' : 'toggled'}`)
  }, [selectionMode])

  const handleConnectionChange = useCallback((connected: boolean, elements: any[], info: any) => {
    setIsConnected(connected)
    if (connected && elements) {
      setLoadedElements(elements)
      console.log('Loaded elements:', elements.length)
    }
  }, [])

  const handleCreateTask = () => {
    if (selectedElements.length === 0) {
      toast.error('Please select at least one element')
      return
    }
    setShowCreateTaskDialog(true)
  }

  const handleClearSelection = () => {
    setSelectedElements([])
    // Reset viewer highlighting
    viewerRef.current?.unIsolateObjects()
    toast.info('Selection cleared')
  }

  const handleExportSelection = () => {
    if (selectedElements.length === 0) {
      toast.error('No elements selected')
      return
    }

    const exportData = selectedElements.map(el => ({
      id: el.id,
      type: el.type,
      name: el.name,
      properties: el.properties
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected-elements-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Selection exported!')
  }

  const handleTaskCreated = () => {
    handleClearSelection()
    onTaskCreated?.()
  }

  // Apply task-based coloring to elements
  const applyTaskColors = useCallback(() => {
    if (!viewerRef.current || !isConnected) return

    const colorMap: { [elementId: string]: string } = {}
    
    tasks.forEach(task => {
      const color = getTaskStatusColor(task.status)
      // Assuming task has linked elements
      task.elementLinks?.forEach((link: any) => {
        colorMap[link.elementId] = color
      })
    })

    // Apply colors to viewer
    // viewerRef.current.setColorByProperty('id', colorMap, '#CCCCCC')
  }, [tasks, isConnected])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
      {/* Selection Toolbar - Left Side */}
      <div className="lg:col-span-1">
        <ElementSelectionToolbar
          selectedElements={selectedElements}
          onSelectionModeChange={setSelectionMode}
          onCreateTask={handleCreateTask}
          onClearSelection={handleClearSelection}
          onExportSelection={handleExportSelection}
          selectionMode={selectionMode}
        />
      </div>

      {/* Speckle Viewer - Right Side */}
      <div className="lg:col-span-4">
        <SpeckleViewer
          ref={viewerRef}
          project={project}
          onElementSelect={handleElementSelect}
          selectedElements={selectedElements.map(el => el.id)}
          onConnectionChange={handleConnectionChange}
        />
      </div>

      {/* Create Task Dialog */}
      <CreateTaskFromElementsDialog
        open={showCreateTaskDialog}
        onOpenChange={setShowCreateTaskDialog}
        selectedElements={selectedElements}
        projectId={project.id}
        teams={teams}
        users={users}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  )
}

function getTaskStatusColor(status: string): string {
  switch (status) {
    case 'todo':
      return '#9CA3AF' // Grey
    case 'in_progress':
      return '#FCD34D' // Yellow
    case 'completed':
      return '#10B981' // Green
    default:
      return '#CCCCCC'
  }
}
