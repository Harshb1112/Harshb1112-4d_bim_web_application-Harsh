'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MousePointer, 
  Box, 
  Lasso, 
  Layers, 
  Tag, 
  Ruler,
  Download,
  X
} from 'lucide-react'
import { toast } from 'sonner'

export type SelectionMode = 'single' | 'box' | 'lasso' | 'layer'

interface ElementSelectionToolbarProps {
  selectedElements: Array<{
    id: string
    type?: string
    name?: string
    properties?: any
  }>
  onSelectionModeChange: (mode: SelectionMode) => void
  onCreateTask: () => void
  onClearSelection: () => void
  onExportSelection: () => void
  selectionMode: SelectionMode
}

export default function ElementSelectionToolbar({
  selectedElements,
  onSelectionModeChange,
  onCreateTask,
  onClearSelection,
  onExportSelection,
  selectionMode
}: ElementSelectionToolbarProps) {
  const elementsByType = selectedElements.reduce((acc, el) => {
    const type = el.type || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Mode descriptions
  const modeDescriptions = {
    single: 'Click elements one at a time',
    box: 'Hold Shift + Drag to select multiple elements in a box',
    lasso: 'Draw a freehand selection around elements',
    layer: 'Select all elements of the same type/layer'
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Selection Tools</h3>
        {selectedElements.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Selection Mode Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={selectionMode === 'single' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectionModeChange('single')}
          className="flex flex-col h-auto py-2"
        >
          <MousePointer className="h-4 w-4 mb-1" />
          <span className="text-xs">Single</span>
        </Button>
        <Button
          variant={selectionMode === 'box' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectionModeChange('box')}
          className="flex flex-col h-auto py-2"
        >
          <Box className="h-4 w-4 mb-1" />
          <span className="text-xs">Multi</span>
        </Button>
        <Button
          variant={selectionMode === 'lasso' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectionModeChange('lasso')}
          className="flex flex-col h-auto py-2"
        >
          <Lasso className="h-4 w-4 mb-1" />
          <span className="text-xs">Lasso</span>
        </Button>
        <Button
          variant={selectionMode === 'layer' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectionModeChange('layer')}
          className="flex flex-col h-auto py-2"
        >
          <Layers className="h-4 w-4 mb-1" />
          <span className="text-xs">Layer</span>
        </Button>
      </div>

      {/* Mode Instructions */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>{selectionMode.charAt(0).toUpperCase() + selectionMode.slice(1)} Mode:</strong>
          <br />
          {modeDescriptions[selectionMode]}
        </p>
        {selectionMode === 'box' && (
          <p className="text-xs text-blue-600 mt-1">
            💡 Hold Ctrl/Cmd to add to selection
          </p>
        )}
      </div>

      {/* Selected Elements Summary */}
      {selectedElements.length > 0 && (
        <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          {/* Element Type Breakdown */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(elementsByType).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
            <Button
              size="sm"
              onClick={onCreateTask}
              className="w-full"
            >
              <Tag className="h-3 w-3 mr-1" />
              Create Task
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onExportSelection}
              className="w-full"
            >
              <Download className="h-3 w-3 mr-1" />
              Export List
            </Button>
          </div>
        </div>
      )}

      {selectedElements.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          <p className="mb-2">Select elements in the 3D viewer</p>
          <p className="text-xs text-gray-400">
            Works with Autodesk, Speckle & IFC models
          </p>
        </div>
      )}
    </Card>
  )
}
