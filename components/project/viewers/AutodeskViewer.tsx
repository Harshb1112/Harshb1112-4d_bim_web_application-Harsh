/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'

export interface AutodeskViewerRef {
  isolateObjects: (guids: string[], ghost?: boolean) => void
  unIsolateObjects: () => void
  selectObjects: (guids: string[]) => void
  fitToView: (guids?: string[]) => void
  hideObjects: (guids: string[]) => void
  showAllObjects: () => void
  applyFilter: (property: string, value: any) => void
  clearFilter: () => void
}

interface AutodeskViewerProps {
  model: any
  onElementSelect?: (elementId: string, element: any) => void
}

const AutodeskViewer = forwardRef<AutodeskViewerRef, AutodeskViewerProps>(({ model, onElementSelect }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const onElementSelectRef = useRef(onElementSelect)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [viewerInitialized, setViewerInitialized] = useState(false)
  
  // Keep the callback ref updated without triggering re-render
  useEffect(() => {
    onElementSelectRef.current = onElementSelect
  }, [onElementSelect])

  // Expose methods via ref for external control
  useImperativeHandle(ref, () => ({
    isolateObjects: (guids: string[], ghost?: boolean) => {
      if (!viewerRef.current) return
      const viewer = viewerRef.current
      
      // For Autodesk, guids might be dbIds as strings
      const dbIds = guids.map(g => {
        const num = parseInt(g)
        return isNaN(num) ? g : num
      }).filter(id => typeof id === 'number') as number[]
      
      if (dbIds.length > 0) {
        viewer.isolate(dbIds)
        viewer.fitToView(dbIds)
        
        // Apply highlight color
        try {
          const Autodesk = (window as any).Autodesk
          const THREE = Autodesk?.Viewing?.Private?.THREE || (window as any).THREE
          if (THREE?.Color) {
            const highlightColor = new THREE.Color(0.2, 0.6, 1.0) // Blue highlight
            dbIds.forEach(dbId => {
              viewer.setThemingColor(dbId, highlightColor, viewer.model, true)
            })
          }
        } catch (e) {
          console.warn('Could not apply highlight color:', e)
        }
      }
    },
    unIsolateObjects: () => {
      if (!viewerRef.current) return
      const viewer = viewerRef.current
      viewer.isolate([]) // Show all
      viewer.fitToView()
      try {
        viewer.clearThemingColors(viewer.model)
      } catch (e) {
        // Ignore
      }
    },
    selectObjects: (guids: string[]) => {
      if (!viewerRef.current) return
      const dbIds = guids.map(g => parseInt(g)).filter(id => !isNaN(id))
      if (dbIds.length > 0) {
        viewerRef.current.select(dbIds)
      }
    },
    fitToView: (guids?: string[]) => {
      if (!viewerRef.current) return
      if (guids && guids.length > 0) {
        const dbIds = guids.map(g => parseInt(g)).filter(id => !isNaN(id))
        viewerRef.current.fitToView(dbIds)
      } else {
        viewerRef.current.fitToView()
      }
    },
    hideObjects: (guids: string[]) => {
      if (!viewerRef.current) return
      const viewer = viewerRef.current
      const dbIds = guids.map(g => parseInt(g)).filter(id => !isNaN(id))
      if (dbIds.length > 0) {
        viewer.hide(dbIds)
      }
    },
    showAllObjects: () => {
      if (!viewerRef.current) return
      const viewer = viewerRef.current
      viewer.show(viewer.model.getInstanceTree().getRootId())
    },
    applyFilter: (property: string, value: any) => {
      if (!viewerRef.current) return
      const viewer = viewerRef.current
      
      // Get all dbIds
      const instanceTree = viewer.model.getInstanceTree()
      if (!instanceTree) return
      
      const allDbIds: number[] = []
      instanceTree.enumNodeChildren(instanceTree.getRootId(), (dbId: number) => {
        allDbIds.push(dbId)
      }, true)
      
      // Filter by property
      const matchingIds: number[] = []
      allDbIds.forEach((dbId: number) => {
        viewer.getProperties(dbId, (props: any) => {
          const prop = props.properties?.find((p: any) => p.displayName === property || p.attributeName === property)
          if (prop && (prop.displayValue === value || prop.displayValue === String(value))) {
            matchingIds.push(dbId)
          }
        })
      })
      
      // Isolate matching elements
      setTimeout(() => {
        if (matchingIds.length > 0) {
          viewer.isolate(matchingIds)
        }
      }, 500)
    },
    clearFilter: () => {
      if (!viewerRef.current) return
      const viewer = viewerRef.current
      viewer.isolate([]) // Show all
      viewer.clearThemingColors(viewer.model)
    }
  }))

  // Handle Autodesk login for ACC access
  const handleAutodeskLogin = () => {
    const currentUrl = window.location.pathname
    const state = JSON.stringify({ returnUrl: currentUrl, source: 'acc' })
    window.location.href = `/api/autodesk/auth?projectId=${model.projectId || ''}&source=acc&state=${encodeURIComponent(state)}`
  }

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

        // Helper function to encode URN to base64 (URL safe)
        const encodeUrn = (urn: string): string => {
          // If already base64 encoded (no colons, no special chars), return as is
          if (!urn.includes(':') && !urn.includes('/')) {
            return urn
          }
          // Encode to base64 URL safe format
          const base64 = btoa(urn)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
          return base64
        }

        // Process the URN
        let urn = model.sourceId
        console.log('Original URN:', urn)

        // Handle different URN formats
        // 1. Already base64 encoded (from our translate API)
        // 2. Data Management API format: urn:adsk.wipprod:dm.lineage:XXXX
        // 3. Plain URN without prefix
        
        if (urn.startsWith('urn:adsk.wipprod:') || urn.startsWith('urn:adsk.wipstg:')) {
          // This is a Data Management lineage ID - need to get the derivative URN
          // For ACC/BIM360, we need to use the item's derivative URN
          console.log('Detected Data Management URN, encoding...')
          urn = encodeUrn(urn)
        } else if (urn.includes(':')) {
          // Other URN format, encode it
          urn = encodeUrn(urn)
        }
        // else: assume it's already base64 encoded

        const documentId = `urn:${urn}`
        console.log('Document ID for viewer:', documentId)

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
          
          // Configure navigation settings for better zoom control
          viewer.navigation.setZoomTowardsPivot(true)
          viewer.navigation.setReverseZoomDirection(false)

          Autodesk.Viewing.Document.load(
            documentId,
            (doc: any) => {
              const viewables = doc.getRoot().getDefaultGeometry()
              if (!viewables) {
                setError('No viewable geometry found in this model. The model may not be translated yet.')
                setLoading(false)
                return
              }
              
              viewer.loadDocumentNode(doc, viewables).then(() => {
                setLoading(false)
                setViewerInitialized(true)
                viewerRef.current = viewer
                
                // Store viewer globally for element extraction
                if (viewer && typeof viewer === 'object') {
                  (window as any).autodeskViewer = viewer
                }

                // Add selection event - use ref to avoid re-renders
                viewer.addEventListener(
                  Autodesk.Viewing.SELECTION_CHANGED_EVENT,
                  (event: any) => {
                    const selection = event.dbIdArray
                    if (selection && selection.length > 0) {
                      const dbId = selection[0]
                      if (viewer && viewer.getProperties) {
                        viewer.getProperties(dbId, (props: any) => {
                          if (onElementSelectRef.current) {
                            onElementSelectRef.current(dbId.toString(), props)
                          }
                        })
                      }
                    }
                  }
                )
              }).catch((err: any) => {
                console.error('Error loading document node:', err)
                setError('Failed to load model')
                setLoading(false)
              })
            },
            (errCode: any, errorMsg: any) => {
              console.error('Error loading document:', errCode, errorMsg)
              let errorMessage = `Failed to load model (Error ${errCode})`
              if (errCode === 4) {
                errorMessage = 'Model not found. Please check if the URN is correct and the model is translated.'
              } else if (errCode === 5) {
                errorMessage = 'Access denied. You need to login with your Autodesk account to view ACC/BIM360 models.'
              } else if (errCode === 9) {
                errorMessage = 'Model translation in progress. Please wait and try again.'
              }
              setError(errorMessage)
              setErrorCode(errCode)
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
    
    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        viewerRef.current.finish()
        viewerRef.current = null
      }
    }
  }, [model?.sourceId]) // Only re-initialize when model sourceId changes

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#2d2d2d] rounded-lg border border-gray-700">
        <Alert className="max-w-md bg-gray-800 border-red-500/50">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-gray-300">
            <strong>Error Loading Autodesk Model</strong>
            <p className="mt-2">{error}</p>
            <p className="mt-2 text-xs text-gray-500">
              Model: {model.name}
            </p>
            {errorCode === 5 && (
              <Button 
                onClick={handleAutodeskLogin}
                className="mt-4 bg-orange-500 hover:bg-orange-600"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login with Autodesk
              </Button>
            )}
          </AlertDescription>
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
        {viewerInitialized && (
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
            Connected
          </span>
        )}
      </div>

      {/* Viewer Container */}
      <div 
        ref={containerRef} 
        className="h-[calc(100%-40px)] w-full relative"
        style={{ minHeight: '660px' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d] z-10">
            <div className="text-center bg-gray-800/90 p-6 rounded-xl border border-gray-700">
              <Loader2 className="h-10 w-10 animate-spin text-orange-400 mx-auto mb-3" />
              <p className="text-white font-medium">Loading Autodesk Model</p>
              <p className="text-gray-400 text-sm mt-1">{model?.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

AutodeskViewer.displayName = 'AutodeskViewer'

export default AutodeskViewer
