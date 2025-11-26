/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

interface AutodeskViewerProps {
  model: any
  onElementSelect?: (elementId: string, element: any) => void
}

export default function AutodeskViewer({ model, onElementSelect }: AutodeskViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerInitialized, setViewerInitialized] = useState(false)

  useEffect(() => {
    if (!model?.sourceId) {
      setError('No Autodesk URN provided')
      setLoading(false)
      return
    }

    // Load Autodesk Forge Viewer SDK
    const loadForgeViewer = async () => {
      try {
        // Check if Autodesk Viewing is already loaded
        if (typeof window !== 'undefined' && (window as any).Autodesk) {
          initializeViewer()
          return
        }

        // Load Forge Viewer CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css'
        document.head.appendChild(link)

        // Load Forge Viewer JS
        const script = document.createElement('script')
        script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js'
        script.async = true
        script.onload = () => {
          initializeViewer()
        }
        script.onerror = () => {
          setError('Failed to load Autodesk Forge Viewer SDK')
          setLoading(false)
        }
        document.head.appendChild(script)
      } catch (err) {
        console.error('Error loading Forge Viewer:', err)
        setError('Failed to initialize viewer')
        setLoading(false)
      }
    }

    const initializeViewer = async () => {
      if (!containerRef.current) return

      try {
        const Autodesk = (window as any).Autodesk
        
        // Get access token from API
        const tokenResponse = await fetch('/api/autodesk/token', {
          credentials: 'include'
        })
        
        if (!tokenResponse.ok) {
          throw new Error('Failed to get Autodesk token')
        }

        const { access_token } = await tokenResponse.json()

        // Initialize viewer
        const options = {
          env: 'AutodeskProduction',
          api: 'derivativeV2',
          getAccessToken: (callback: any) => {
            callback(access_token, 3600)
          }
        }

        Autodesk.Viewing.Initializer(options, () => {
          const viewer = new Autodesk.Viewing.GuiViewer3D(containerRef.current)
          viewer.start()

          const urn = model.sourceId
          const documentId = urn.startsWith('urn:') ? urn : `urn:${urn}`

          Autodesk.Viewing.Document.load(
            documentId,
            (doc: any) => {
              const viewables = doc.getRoot().getDefaultGeometry()
              viewer.loadDocumentNode(doc, viewables).then(() => {
                setLoading(false)
                setViewerInitialized(true)

                // Add selection event
                if (onElementSelect) {
                  viewer.addEventListener(
                    Autodesk.Viewing.SELECTION_CHANGED_EVENT,
                    (event: any) => {
                      const selection = event.dbIdArray
                      if (selection && selection.length > 0) {
                        const dbId = selection[0]
                        viewer.getProperties(dbId, (props: any) => {
                          onElementSelect(dbId.toString(), props)
                        })
                      }
                    }
                  )
                }
              })
            },
            (errorCode: any) => {
              console.error('Error loading document:', errorCode)
              setError(`Failed to load model: ${errorCode}`)
              setLoading(false)
            }
          )
        })
      } catch (err: any) {
        console.error('Error initializing viewer:', err)
        setError(err.message || 'Failed to initialize viewer')
        setLoading(false)
      }
    }

    loadForgeViewer()
  }, [model, onElementSelect])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading Autodesk model...</p>
          <p className="text-xs text-gray-500 mt-1">Initializing Forge Viewer...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error Loading Autodesk Model</strong>
            <p className="mt-2">{error}</p>
            <p className="mt-2 text-xs text-gray-600">
              Model: {model.name}
              <br />
              URN: {model.sourceId?.slice(0, 30)}...
            </p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full"
      style={{ position: 'relative' }}
    />
  )
}
