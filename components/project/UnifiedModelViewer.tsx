/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo, useState } from 'react'
import SpeckleViewer from './SpeckleViewer'
import AutodeskViewer from './viewers/AutodeskViewer'
import IFCViewer from './viewers/IFCViewer'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Box } from 'lucide-react'

interface UnifiedModelViewerProps {
  project: any
  onElementSelect?: (elementId: string, element: any) => void
  selectedElements?: string[]
}

export default function UnifiedModelViewer({ 
  project, 
  onElementSelect, 
  selectedElements 
}: UnifiedModelViewerProps) {
  
  // Debug: Log project data
  console.log('UnifiedModelViewer - Project:', project)
  console.log('UnifiedModelViewer - Models:', project?.models)
  
  // Analyze all models and their sources
  const modelAnalysis = useMemo(() => {
    if (!project.models || project.models.length === 0) {
      return { hasModels: false, speckleModels: [], autodeskModels: [], allModels: [] }
    }

    const speckleModels: any[] = []
    const autodeskModels: any[] = []

    project.models.forEach((model: any) => {
      // Check if it's from Autodesk
      if (model.sourceId && (model.source === 'autodesk_construction_cloud' || model.source === 'autodesk_drive')) {
        autodeskModels.push(model)
      }
      // Check if it's from Speckle
      else if (model.speckleUrl || model.streamId || model.source === 'speckle') {
        speckleModels.push(model)
      }
      // Default to Speckle for backward compatibility
      else {
        speckleModels.push(model)
      }
    })

    return {
      hasModels: true,
      speckleModels,
      autodeskModels,
      allModels: project.models
    }
  }, [project.models])

  // Default to first Speckle model, or first model if no Speckle models
  const defaultModelId = useMemo(() => {
    if (modelAnalysis.speckleModels.length > 0) {
      return modelAnalysis.speckleModels[0].id
    }
    return modelAnalysis.allModels.length > 0 ? modelAnalysis.allModels[0].id : null
  }, [modelAnalysis])

  const [selectedModelId, setSelectedModelId] = useState<number | null>(defaultModelId)

  // Get currently selected model
  const selectedModel = useMemo(() => {
    return modelAnalysis.allModels.find((m: any) => m.id === selectedModelId)
  }, [modelAnalysis.allModels, selectedModelId])

  // Determine selected model source with detailed type
  const selectedModelSource = useMemo(() => {
    if (!selectedModel) return { type: 'none', detail: '' }
    
    // Check source field first
    if (selectedModel.source) {
      return { 
        type: selectedModel.source,
        detail: selectedModel.source 
      }
    }
    
    // Autodesk sources
    if (selectedModel.sourceId && (selectedModel.source === 'autodesk_construction_cloud' || selectedModel.source === 'autodesk_drive')) {
      return { type: 'autodesk', detail: selectedModel.source }
    }
    
    // Speckle
    if (selectedModel.speckleUrl || selectedModel.streamId) {
      return { type: 'speckle', detail: 'speckle' }
    }
    
    // IFC file
    if (selectedModel.fileUrl && selectedModel.fileUrl.endsWith('.ifc')) {
      return { type: 'ifc', detail: 'local_ifc' }
    }
    
    // Default to speckle
    return { type: 'speckle', detail: 'speckle' }
  }, [selectedModel])

  // No models
  if (!modelAnalysis.hasModels) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No 3D models uploaded yet. Upload a model from the "3D Models" tab to view it here.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Check if selected model has required data
  const modelHasData = useMemo(() => {
    if (!selectedModel) return false
    
    // Check if model has any viewable data
    const hasSpeckleData = !!(selectedModel.speckleUrl || selectedModel.streamId)
    const hasAutodeskData = !!(selectedModel.sourceId && (selectedModel.source === 'autodesk_construction_cloud' || selectedModel.source === 'autodesk_drive'))
    const hasIFCData = !!(selectedModel.filePath || selectedModel.sourceUrl)
    
    return hasSpeckleData || hasAutodeskData || hasIFCData
  }, [selectedModel])

  return (
    <div className="h-full flex flex-col">
      {/* Model Selector - if multiple models */}
      {modelAnalysis.allModels.length > 1 && (
        <div className="p-3 bg-gray-50 border-b flex items-center gap-3">
          <Box className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Select Model:</span>
          <Select 
            value={selectedModelId?.toString()} 
            onValueChange={(val) => setSelectedModelId(parseInt(val))}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelAnalysis.allModels.map((model: any) => {
                // Determine source label
                let sourceLabel = 'Unknown'
                let sourceColor = 'secondary'
                
                if (model.source === 'speckle' || model.speckleUrl || model.streamId) {
                  sourceLabel = 'Speckle'
                  sourceColor = 'default'
                } else if (model.source === 'autodesk_construction_cloud') {
                  sourceLabel = 'ACC'
                  sourceColor = 'destructive'
                } else if (model.source === 'autodesk_drive' || (model.sourceId && model.source?.includes('autodesk'))) {
                  sourceLabel = 'Autodesk'
                  sourceColor = 'destructive'
                } else if (model.source === 'local_ifc' || (model.fileUrl && model.fileUrl.endsWith('.ifc'))) {
                  sourceLabel = 'IFC'
                  sourceColor = 'secondary'
                }
                
                return (
                  <SelectItem key={model.id} value={model.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{model.name || `Model ${model.id}`}</span>
                      <Badge variant="outline" className="text-xs">{sourceLabel}</Badge>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          
          {/* Source badges */}
          <div className="ml-auto flex gap-2">
            {modelAnalysis.speckleModels.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {modelAnalysis.speckleModels.length} Speckle
              </Badge>
            )}
            {modelAnalysis.autodeskModels.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {modelAnalysis.autodeskModels.length} Autodesk
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Viewer Area */}
      <div className="flex-1 overflow-hidden">
        {/* Model data incomplete warning */}
        {!modelHasData && (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Model Data Incomplete: {selectedModel?.name}</strong>
                <p className="mt-2">
                  This model was created but the actual model data (URN, URL, or file) was not uploaded properly.
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  Model Source: {selectedModel?.source || 'Unknown'}
                  <br />
                  Missing: {
                    selectedModelSource.type === 'speckle' ? 'Speckle URL/Stream ID' :
                    selectedModelSource.type === 'autodesk' ? 'Autodesk URN' :
                    selectedModelSource.type === 'ifc' ? 'IFC File URL' :
                    'Model data'
                  }
                </p>
                <p className="mt-2 text-sm">
                  Please re-upload this model with complete data.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Speckle Viewer */}
        {modelHasData && selectedModelSource.type === 'speckle' && (
          <SpeckleViewer
            project={{
              ...project,
              speckleUrl: selectedModel?.speckleUrl || project.speckleUrl,
              models: [selectedModel]
            }}
            onElementSelect={onElementSelect}
            selectedElements={selectedElements}
          />
        )}

        {/* Autodesk Forge Viewer */}
        {modelHasData && (selectedModelSource.type === 'autodesk' || selectedModelSource.detail === 'autodesk_drive' || selectedModelSource.detail === 'autodesk_construction_cloud') && (
          <AutodeskViewer
            model={selectedModel}
            onElementSelect={onElementSelect}
          />
        )}

        {/* Local IFC File Viewer */}
        {modelHasData && (selectedModelSource.type === 'ifc' || selectedModelSource.detail === 'local_ifc') && (
          <IFCViewer
            model={selectedModel}
            onElementSelect={onElementSelect}
          />
        )}
      </div>
    </div>
  )
}
