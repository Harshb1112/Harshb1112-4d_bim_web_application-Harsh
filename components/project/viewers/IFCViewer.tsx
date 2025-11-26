/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

interface IFCViewerProps {
  model: any
  onElementSelect?: (elementId: string, element: any) => void
}

export default function IFCViewer({ model, onElementSelect }: IFCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!model?.fileUrl) {
      setError('No IFC file URL provided')
      setLoading(false)
      return
    }

    // TODO: Integrate web-ifc-viewer or IFC.js
    // For now, show placeholder
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [model])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading IFC model...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full bg-gray-900 relative">
      {/* Placeholder for IFC viewer */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>IFC Model: {model.name}</strong>
            <p className="mt-2">
              IFC.js viewer integration coming soon.
            </p>
            <p className="mt-2 text-xs text-gray-600">
              File: {model.fileUrl?.split('/').pop()}
            </p>
            <p className="mt-2 text-xs">
              <a 
                href={model.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Download IFC file →
              </a>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
