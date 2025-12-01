/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    Autodesk: any
  }
}

export interface ForgeViewerRef {
  isolateObjects: (ids: number[]) => void
  hideObjects: (ids: number[]) => void
  showObjects: (ids: number[]) => void
  setColorFilter: (filter: any) => void
  fitToView: () => void
  getCanvas: () => HTMLCanvasElement | null
}

interface ForgeViewerProps {
  urn: string
  accessToken?: string
  onElementSelect?: (dbId: number, properties: any) => void
  onModelLoaded?: () => void
}

const ForgeViewer = forwardRef<ForgeViewerRef, ForgeViewerProps>(
  ({ urn, accessToken, onElementSelect, onModelLoaded }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewerRef = useRef<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)

    // Expose methods for external control
    useImperativeHandle(ref, () => ({
      isolateObjects: (ids: number[]) => {
        if (viewerRef.current) {
          viewerRef.current.isolate(ids)
        }
      },
      hideObjects: (ids: number[]) => {
        if (viewerRef.current) {
          viewerRef.current.hide(ids)
        }
      },
      showObjects: (ids: number[]) => {
        if (viewerRef.current) {
          viewerRef.current.show(ids)
        }
      },
      setColorFilter: (filter: any) => {
        if (viewerRef.current && filter.multiple) {
          filter.multiple.forEach((item: any) => {
            const color = new window.Autodesk.Viewing.THREE.Color(item.color)
            viewerRef.current.setThemingColor(parseInt(item.property.value), color)
          })
        }
      },
      fitToView: () => {
        if (viewerRef.current) {
          viewerRef.current.fitToView()
        }
      },
      getCanvas: () => {
        return containerRef.current?.querySelector('canvas') || null
      }
    }))

    // Load Forge Viewer scripts
    const loadForgeScripts = async (): Promise<void> => {
      if (window.Autodesk) return

      return new Promise((resolve) => {
        // Load CSS
        const css = document.createElement('link')
        css.rel = 'stylesheet'
        css.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css'
        document.head.appendChild(css)

        // Load JS
        const script = document.createElement('script')
        script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js'
        script.onload = () => resolve()
        document.body.appendChild(script)
      })
    }

    // Get access token
    const getAccessToken = async (): Promise<{ access_token: string; expires_in: number }> => {
      if (accessToken) {
        return { access_token: accessToken, expires_in: 3600 }
      }

      // Fetch from your API
      const response = await fetch('/api/autodesk/token', { credentials: 'include' })
      if (!response.ok) {
        throw new Error('Failed to get Autodesk access token')
      }
      return response.json()
    }


    useEffect(() => {
      if (!urn) {
        setError('No model URN provided')
        setLoading(false)
        return
      }

      let viewer: any = null

      const initViewer = async () => {
        try {
          setProgress(10)
          
          // Load Forge scripts
          await loadForgeScripts()
          setProgress(30)

          // Get token
          const tokenData = await getAccessToken()
          setProgress(50)

          // Initialize viewer
          const options = {
            env: 'AutodeskProduction',
            api: 'derivativeV2',
            getAccessToken: (callback: any) => {
              callback(tokenData.access_token, tokenData.expires_in)
            }
          }

          window.Autodesk.Viewing.Initializer(options, () => {
            if (!containerRef.current) return

            // Create viewer
            viewer = new window.Autodesk.Viewing.GuiViewer3D(containerRef.current, {
              extensions: ['Autodesk.DocumentBrowser']
            })
            viewer.start()
            viewerRef.current = viewer

            // Load model
            loadModel(viewer, urn)
          })

        } catch (err: any) {
          console.error('[ForgeViewer] Error:', err)
          setError(err.message || 'Failed to initialize viewer')
          setLoading(false)
        }
      }

      const loadModel = (viewer: any, modelUrn: string) => {
        const documentId = `urn:${modelUrn}`

        window.Autodesk.Viewing.Document.load(
          documentId,
          async (doc: any) => {
            setProgress(70)
            
            const defaultGeometry = doc.getRoot().getDefaultGeometry()
            await viewer.loadDocumentNode(doc, defaultGeometry)

            setProgress(100)
            setLoading(false)

            // Setup selection handler
            viewer.addEventListener(
              window.Autodesk.Viewing.SELECTION_CHANGED_EVENT,
              (event: any) => {
                if (event.dbIdArray && event.dbIdArray.length > 0) {
                  const dbId = event.dbIdArray[0]
                  
                  viewer.getProperties(dbId, (props: any) => {
                    if (onElementSelect) {
                      onElementSelect(dbId, props)
                    }
                  })
                }
              }
            )

            if (onModelLoaded) {
              onModelLoaded()
            }

            console.log('[ForgeViewer] Model loaded successfully')
          },
          (errorCode: any, errorMessage: any) => {
            console.error('[ForgeViewer] Document load error:', errorCode, errorMessage)
            setError(`Failed to load model: ${errorMessage}`)
            setLoading(false)
          }
        )
      }

      initViewer()

      return () => {
        if (viewer) {
          viewer.finish()
          viewer = null
        }
      }
    }, [urn, accessToken])

    // Resize handler
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const handleResize = () => {
        if (viewerRef.current) {
          viewerRef.current.resize()
        }
      }

      const observer = new ResizeObserver(handleResize)
      observer.observe(container)

      return () => observer.disconnect()
    }, [])

    if (error) {
      return (
        <div className="flex items-center justify-center h-full bg-[#2d2d2d] rounded-lg border border-gray-700">
          <Alert className="max-w-md bg-gray-800 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-gray-300">{error}</AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className="h-full w-full rounded-lg border border-gray-700 shadow-lg overflow-hidden bg-[#2d2d2d]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span className="text-white text-sm font-medium">Autodesk Viewer</span>
          </div>
          {!loading && (
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
              Connected
            </span>
          )}
        </div>

        {/* Viewer Container */}
        <div 
          ref={containerRef} 
          className="h-[calc(100%-40px)] w-full relative"
          style={{ minHeight: '450px' }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d] z-10">
              <div className="text-center bg-gray-800/90 p-6 rounded-xl border border-gray-700">
                <Loader2 className="h-10 w-10 animate-spin text-orange-400 mx-auto mb-3" />
                <p className="text-white font-medium">Loading Autodesk Model</p>
                <div className="w-48 bg-gray-700 rounded-full h-2 mt-4 mx-auto overflow-hidden">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2">{progress}%</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

ForgeViewer.displayName = 'ForgeViewer'

export default ForgeViewer
