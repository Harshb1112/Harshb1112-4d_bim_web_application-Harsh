/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { forwardRef, useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'

export interface SimulationAutodeskViewerRef {
  isolateObjects: (guids: string[], ghost?: boolean) => void
  hideObjects: (guids: string[]) => void
  showObjects: (guids: string[]) => void
  setColorFilter: (filter: any) => void
  getCanvas: () => HTMLCanvasElement | null
  resetColors: () => void
}

interface SimulationAutodeskViewerProps {
  model: any
  onElementSelect?: (elementId: string, element: any) => void
  viewerCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>
}

const SimulationAutodeskViewer = forwardRef<SimulationAutodeskViewerRef, SimulationAutodeskViewerProps>(
  ({ model, onElementSelect, viewerCanvasRef }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewerRef = useRef<any>(null)
    const onElementSelectRef = useRef(onElementSelect)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [errorCode, setErrorCode] = useState<number | null>(null)
    const [viewerInitialized, setViewerInitialized] = useState(false)
    
    // Store dbId to guid mapping
    const dbIdToGuidMap = useRef<Map<number, string>>(new Map())
    const guidToDbIdMap = useRef<Map<string, number>>(new Map())
    const allDbIds = useRef<number[]>([])
    
    // Keep the callback ref updated
    useEffect(() => {
      onElementSelectRef.current = onElementSelect
    }, [onElementSelect])

    // Build element mapping when viewer is ready
    const buildElementMapping = useCallback(async () => {
      if (!viewerRef.current) return
      
      const viewer = viewerRef.current
      const instanceTree = viewer.model?.getInstanceTree()
      if (!instanceTree) return

      const dbIds: number[] = []
      instanceTree.enumNodeChildren(instanceTree.getRootId(), (dbId: number) => {
        dbIds.push(dbId)
      }, true)
      
      allDbIds.current = dbIds
      
      // Get properties for all elements to build guid mapping
      for (const dbId of dbIds) {
        try {
          await new Promise<void>((resolve) => {
            viewer.getProperties(dbId, (props: any) => {
              // Try to find a unique identifier (externalId, guid, or use dbId)
              const guid = props.externalId || props.guid || `autodesk-${dbId}`
              dbIdToGuidMap.current.set(dbId, guid)
              guidToDbIdMap.current.set(guid, dbId)
              resolve()
            }, () => resolve())
          })
        } catch (e) {
          // Use dbId as fallback
          const guid = `autodesk-${dbId}`
          dbIdToGuidMap.current.set(dbId, guid)
          guidToDbIdMap.current.set(guid, dbId)
        }
      }
      
      console.log(`[SimulationAutodeskViewer] Mapped ${dbIdToGuidMap.current.size} elements`)
    }, [])

    // Convert guids to dbIds
    const guidsToDbIds = useCallback((guids: string[]): number[] => {
      const dbIds: number[] = []
      for (const guid of guids) {
        const dbId = guidToDbIdMap.current.get(guid)
        if (dbId !== undefined) {
          dbIds.push(dbId)
        } else {
          // Try parsing as number (in case guid is actually a dbId string)
          const numId = parseInt(guid)
          if (!isNaN(numId)) {
            dbIds.push(numId)
          }
        }
      }
      console.log('[SimulationAutodeskViewer] guidsToDbIds:', guids.length, 'guids ->', dbIds.length, 'dbIds')
      return dbIds
    }, [])

    // Expose simulation interface
    useImperativeHandle(ref, () => ({
      isolateObjects: (guids: string[], ghost?: boolean) => {
        if (!viewerRef.current) return
        const viewer = viewerRef.current
        const dbIds = guidsToDbIds(guids)
        
        if (dbIds.length > 0) {
          viewer.isolate(dbIds)
          if (ghost) {
            // Ghost non-isolated elements
            const otherDbIds = allDbIds.current.filter(id => !dbIds.includes(id))
            viewer.setGhosting(true)
          }
        }
      },

      hideObjects: (guids: string[]) => {
        if (!viewerRef.current) return
        const viewer = viewerRef.current
        const dbIds = guidsToDbIds(guids)
        
        if (dbIds.length > 0) {
          viewer.hide(dbIds)
        } else {
          // Hide all if no specific guids
          viewer.hideAll()
        }
      },

      showObjects: (guids: string[]) => {
        if (!viewerRef.current) return
        const viewer = viewerRef.current
        const dbIds = guidsToDbIds(guids)
        
        if (dbIds.length > 0) {
          viewer.show(dbIds)
        }
      },

      setColorFilter: (filter: any) => {
        if (!viewerRef.current) return
        const viewer = viewerRef.current
        
        // Clear existing colors first
        try {
          viewer.clearThemingColors(viewer.model)
        } catch (e) {
          console.warn('Could not clear theming colors:', e)
        }
        
        console.log('[SimulationAutodeskViewer] setColorFilter called with', filter.multiple?.length || 0, 'items')
        
        if (filter.multiple && Array.isArray(filter.multiple)) {
          // Apply multiple color filters
          let appliedCount = 0
          for (const item of filter.multiple) {
            const guid = item.property?.value
            if (guid) {
              // Try to get dbId from map, or parse guid as number directly
              let dbId = guidToDbIdMap.current.get(guid)
              if (dbId === undefined) {
                // Try parsing as number (guid might be a dbId string)
                const parsed = parseInt(guid)
                if (!isNaN(parsed)) {
                  dbId = parsed
                }
              }
              
              if (dbId !== undefined && !isNaN(dbId)) {
                try {
                  const color = hexToColor(item.color)
                  if (color) {
                    viewer.setThemingColor(dbId, color, viewer.model, true)
                    appliedCount++
                  }
                } catch (e) {
                  // Silently ignore color errors
                }
              }
            }
          }
          console.log('[SimulationAutodeskViewer] Applied colors to', appliedCount, 'elements')
        } else if (filter.property && filter.color) {
          // Single color filter
          const guid = filter.property.value
          let dbId = guidToDbIdMap.current.get(guid)
          if (dbId === undefined) {
            const parsed = parseInt(guid)
            if (!isNaN(parsed)) {
              dbId = parsed
            }
          }
          
          if (dbId !== undefined && !isNaN(dbId)) {
            try {
              const color = hexToColor(filter.color)
              if (color) {
                viewer.setThemingColor(dbId, color, viewer.model, true)
              }
            } catch (e) {
              // Silently ignore color errors
            }
          }
        }
      },

      getCanvas: () => {
        if (!containerRef.current) return null
        return containerRef.current.querySelector('canvas') as HTMLCanvasElement | null
      },

      resetColors: () => {
        if (!viewerRef.current) return
        viewerRef.current.clearThemingColors(viewerRef.current.model)
      }
    }))

    // Helper to convert hex color to viewer-compatible color
    const hexToColor = (hex: string): any => {
      try {
        const Autodesk = (window as any).Autodesk
        const THREE = Autodesk?.Viewing?.Private?.THREE || (window as any).THREE
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        if (!result) return null
        
        const r = parseInt(result[1], 16) / 255
        const g = parseInt(result[2], 16) / 255
        const b = parseInt(result[3], 16) / 255
        
        // Try THREE.Color first
        if (THREE?.Color) {
          return new THREE.Color(r, g, b)
        }
        
        // Try THREE.Vector4 (older versions)
        if (THREE?.Vector4) {
          return new THREE.Vector4(r, g, b, 1)
        }
        
        // Fallback: return object with rgb values
        return { r, g, b }
      } catch (e) {
        console.warn('hexToColor error:', e)
        return null
      }
    }

    // Handle Autodesk login
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

      const loadForgeViewer = async () => {
        try {
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
          script.onload = () => initializeViewer()
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
          
          const tokenResponse = await fetch('/api/autodesk/token', {
            credentials: 'include'
          })
          
          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text()
            console.error('[SimulationAutodeskViewer] Token error:', tokenResponse.status, errorText)
            throw new Error(`Failed to get Autodesk token: ${tokenResponse.status}`)
          }

          const tokenData = await tokenResponse.json()
          const access_token = tokenData.access_token
          
          if (!access_token) {
            throw new Error('No access token in response')
          }

          const encodeUrn = (urn: string): string => {
            if (!urn.includes(':') && !urn.includes('/')) {
              return urn
            }
            const base64 = btoa(urn)
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '')
            return base64
          }

          let urn = model.sourceId
          if (urn.startsWith('urn:adsk.wipprod:') || urn.startsWith('urn:adsk.wipstg:')) {
            urn = encodeUrn(urn)
          } else if (urn.includes(':')) {
            urn = encodeUrn(urn)
          }

          const documentId = `urn:${urn}`

          const options = {
            env: 'AutodeskProduction',
            api: 'derivativeV2',
            getAccessToken: (callback: any) => {
              callback(access_token, 3600)
            }
          }

          Autodesk.Viewing.Initializer(options, () => {
            let viewerInstance: any = null
            
            try {
              viewerInstance = new Autodesk.Viewing.GuiViewer3D(containerRef.current)
              
              if (!viewerInstance || typeof viewerInstance.start !== 'function') {
                console.error('[SimulationAutodeskViewer] Failed to create viewer instance')
                setError('Failed to create viewer')
                setLoading(false)
                return
              }
              
              viewerInstance.start()
              
              // Configure navigation settings for better zoom control
              viewerInstance.navigation.setZoomTowardsPivot(true)
              viewerInstance.navigation.setReverseZoomDirection(false)
              
              console.log('[SimulationAutodeskViewer] Viewer instance created successfully')
            } catch (viewerError) {
              console.error('[SimulationAutodeskViewer] Error creating viewer:', viewerError)
              setError('Failed to create viewer instance')
              setLoading(false)
              return
            }

            Autodesk.Viewing.Document.load(
              documentId,
              async (doc: any) => {
                const viewables = doc.getRoot().getDefaultGeometry()
                if (!viewables) {
                  setError('No viewable geometry found')
                  setLoading(false)
                  return
                }
                
                try {
                  console.log('[SimulationAutodeskViewer] Loading document node...')
                  console.log('[SimulationAutodeskViewer] viewerInstance type:', typeof viewerInstance)
                  console.log('[SimulationAutodeskViewer] viewerInstance value:', viewerInstance)
                  console.log('[SimulationAutodeskViewer] viewerInstance.loadDocumentNode type:', typeof viewerInstance?.loadDocumentNode)
                  
                  await viewerInstance.loadDocumentNode(doc, viewables)
                  
                  console.log('[SimulationAutodeskViewer] Document loaded successfully')
                  console.log('[SimulationAutodeskViewer] About to store viewerInstance, type:', typeof viewerInstance)
                  console.log('[SimulationAutodeskViewer] viewerRef:', viewerRef)
                  console.log('[SimulationAutodeskViewer] viewerRef.current before:', viewerRef.current)
                  
                  setLoading(false)
                  setViewerInitialized(true)
                  
                  // Store viewer reference - try direct assignment
                  try {
                    viewerRef.current = viewerInstance
                    console.log('[SimulationAutodeskViewer] ✅ Stored in viewerRef.current successfully')
                  } catch (refError) {
                    console.error('[SimulationAutodeskViewer] ❌ Error storing in viewerRef:', refError)
                    throw refError
                  }
                  
                  // Store viewer globally for element extraction
                  try {
                    (window as any).autodeskViewer = viewerInstance
                    console.log('[SimulationAutodeskViewer] ✅ Stored globally successfully')
                  } catch (globalError) {
                    console.error('[SimulationAutodeskViewer] ❌ Error storing globally:', globalError)
                  }

                  // Set canvas ref
                  if (viewerCanvasRef && containerRef.current) {
                    const canvas = containerRef.current.querySelector('canvas')
                    if (canvas) {
                      viewerCanvasRef.current = canvas as HTMLCanvasElement
                    }
                  }

                  // Build element mapping after model loads
                  setTimeout(() => buildElementMapping(), 1000)

                  // Selection event
                  viewerInstance.addEventListener(
                    Autodesk.Viewing.SELECTION_CHANGED_EVENT,
                    (event: any) => {
                      const selection = event.dbIdArray
                      if (selection && selection.length > 0) {
                        const dbId = selection[0]
                        viewerInstance.getProperties(dbId, (props: any) => {
                          const guid = dbIdToGuidMap.current.get(dbId) || dbId.toString()
                          if (onElementSelectRef.current) {
                            onElementSelectRef.current(guid, { ...props, dbId })
                          }
                        })
                      }
                    }
                  )

                  // Set initial appearance - no theming colors needed
                  // Elements will be colored by the simulation controller
                  viewerInstance.setGhosting(false)
                } catch (loadError) {
                  console.error('[SimulationAutodeskViewer] Error loading document node:', loadError)
                  setError('Failed to load model geometry')
                  setLoading(false)
                }
              },
              (errCode: any, errorMsg: any) => {
                console.error('Error loading document:', errCode, errorMsg)
                let errorMessage = `Failed to load model (Error ${errCode})`
                if (errCode === 4) {
                  errorMessage = 'Model not found'
                } else if (errCode === 5) {
                  errorMessage = 'Access denied. Login required.'
                } else if (errCode === 9) {
                  errorMessage = 'Model translation in progress'
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
      
      return () => {
        if (viewerRef.current) {
          viewerRef.current.finish()
          viewerRef.current = null
        }
      }
    }, [model?.sourceId, buildElementMapping, viewerCanvasRef])

    if (error) {
      return (
        <div className="flex items-center justify-center h-full bg-[#2d2d2d]">
          <Alert className="max-w-md bg-gray-800 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-gray-300">
              <strong>Error Loading Autodesk Model</strong>
              <p className="mt-2">{error}</p>
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
      <div className="h-full w-full bg-[#2d2d2d]">
        <div 
          ref={containerRef} 
          className="h-full w-full"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d] z-10">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-orange-400 mx-auto mb-3" />
                <p className="text-white">Loading Autodesk Model...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

SimulationAutodeskViewer.displayName = 'SimulationAutodeskViewer'

export default SimulationAutodeskViewer
