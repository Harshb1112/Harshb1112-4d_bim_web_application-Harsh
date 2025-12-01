/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { forwardRef, useImperativeHandle, useRef, useMemo, useState } from 'react'
import SpeckleViewer, { SpeckleViewerRef } from '../SpeckleViewer'
import SimulationIFCViewer, { SimulationViewerRef } from './SimulationIFCViewer'
import SimulationAutodeskViewer, { SimulationAutodeskViewerRef } from './SimulationAutodeskViewer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Box } from 'lucide-react'

export interface UnifiedSimulationViewerRef {
  isolateObjects: (guids: string[], ghost?: boolean) => void
  hideObjects: (guids: string[]) => void
  showObjects: (guids: string[]) => void
  setColorFilter: (filter: any) => void
  getCanvas: () => HTMLCanvasElement | null
}

interface UnifiedSimulationViewerProps {
  project: any
  onElementSelect?: (elementId: string, element: any) => void
  viewerCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>
}

const UnifiedSimulationViewer = forwardRef<UnifiedSimulationViewerRef, UnifiedSimulationViewerProps>(
  ({ project, onElementSelect, viewerCanvasRef }, ref) => {
    const speckleViewerRef = useRef<SpeckleViewerRef>(null)
    const ifcViewerRef = useRef<SimulationViewerRef>(null)
    const autodeskViewerRef = useRef<SimulationAutodeskViewerRef>(null)

    // Analyze models
    const modelAnalysis = useMemo(() => {
      if (!project.models || project.models.length === 0) {
        return { hasModels: false, models: [], defaultModel: null }
      }

      const models = project.models.map((model: any) => {
        let source = 'speckle'
        
        if (model.source === 'local' && model.filePath) {
          source = 'ifc'
        } else if (model.sourceId && (model.source === 'autodesk_construction_cloud' || model.source === 'autodesk_drive')) {
          source = 'autodesk'
        } else if (model.speckleUrl || model.streamId || model.source === 'speckle') {
          source = 'speckle'
        } else if ((model.filePath && model.filePath.endsWith('.ifc')) || 
                   (model.fileUrl && model.fileUrl.endsWith('.ifc'))) {
          source = 'ifc'
        }
        
        return { ...model, detectedSource: source }
      })

      return {
        hasModels: true,
        models,
        defaultModel: models[0]
      }
    }, [project.models])

    const [selectedModelId, setSelectedModelId] = useState<number | null>(
      modelAnalysis.defaultModel?.id || null
    )

    const selectedModel = useMemo(() => {
      return modelAnalysis.models.find((m: any) => m.id === selectedModelId) || modelAnalysis.defaultModel
    }, [modelAnalysis.models, selectedModelId, modelAnalysis.defaultModel])

    const viewerType = selectedModel?.detectedSource || 'speckle'

    // Expose unified interface
    useImperativeHandle(ref, () => ({
      isolateObjects: (guids: string[], ghost?: boolean) => {
        if (viewerType === 'autodesk' && autodeskViewerRef.current) {
          autodeskViewerRef.current.isolateObjects(guids, ghost)
        } else if (viewerType === 'ifc' && ifcViewerRef.current) {
          ifcViewerRef.current.isolateObjects(guids, ghost)
        } else if (speckleViewerRef.current) {
          speckleViewerRef.current.isolateObjects(guids, ghost)
        }
      },

      hideObjects: (guids: string[]) => {
        if (viewerType === 'autodesk' && autodeskViewerRef.current) {
          autodeskViewerRef.current.hideObjects(guids)
        } else if (viewerType === 'ifc' && ifcViewerRef.current) {
          ifcViewerRef.current.hideObjects(guids)
        } else if (speckleViewerRef.current) {
          speckleViewerRef.current.hideObjects(guids)
        }
      },

      showObjects: (guids: string[]) => {
        if (viewerType === 'autodesk' && autodeskViewerRef.current) {
          autodeskViewerRef.current.showObjects(guids)
        } else if (viewerType === 'ifc' && ifcViewerRef.current) {
          ifcViewerRef.current.showObjects(guids)
        } else if (speckleViewerRef.current) {
          speckleViewerRef.current.showObjects(guids)
        }
      },

      setColorFilter: (filter: any) => {
        if (viewerType === 'autodesk' && autodeskViewerRef.current) {
          autodeskViewerRef.current.setColorFilter(filter)
        } else if (viewerType === 'ifc' && ifcViewerRef.current) {
          ifcViewerRef.current.setColorFilter(filter)
        } else if (speckleViewerRef.current) {
          speckleViewerRef.current.setColorFilter(filter)
        }
      },

      getCanvas: () => {
        if (viewerType === 'autodesk' && autodeskViewerRef.current) {
          return autodeskViewerRef.current.getCanvas()
        } else if (viewerType === 'ifc' && ifcViewerRef.current) {
          return ifcViewerRef.current.getCanvas()
        }
        return viewerCanvasRef?.current || null
      }
    }))

    if (!modelAnalysis.hasModels) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
          No models available for simulation
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col">
        {/* Model Selector */}
        {modelAnalysis.models.length > 1 && (
          <div className="p-2 bg-gray-50 border-b flex items-center gap-2">
            <Box className="h-4 w-4 text-gray-600" />
            <Select 
              value={selectedModelId?.toString()} 
              onValueChange={(val) => setSelectedModelId(parseInt(val))}
            >
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelAnalysis.models.map((model: any) => (
                  <SelectItem key={model.id} value={model.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="truncate">{model.name || `Model ${model.id}`}</span>
                      <Badge variant="outline" className="text-xs">
                        {model.detectedSource.toUpperCase()}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Viewer */}
        <div className="flex-1 overflow-hidden">
          {viewerType === 'ifc' && selectedModel && (
            <SimulationIFCViewer
              ref={ifcViewerRef}
              model={selectedModel}
              onElementSelect={onElementSelect}
              viewerCanvasRef={viewerCanvasRef}
            />
          )}

          {viewerType === 'speckle' && (
            <SpeckleViewer
              ref={speckleViewerRef}
              project={{
                ...project,
                speckleUrl: selectedModel?.speckleUrl || project.speckleUrl,
                models: selectedModel ? [selectedModel] : project.models
              }}
              viewerCanvasRef={viewerCanvasRef}
            />
          )}

          {viewerType === 'autodesk' && selectedModel && (
            <SimulationAutodeskViewer
              ref={autodeskViewerRef}
              model={selectedModel}
              onElementSelect={onElementSelect}
              viewerCanvasRef={viewerCanvasRef}
            />
          )}
        </div>
      </div>
    )
  }
)

UnifiedSimulationViewer.displayName = 'UnifiedSimulationViewer'

export default UnifiedSimulationViewer
