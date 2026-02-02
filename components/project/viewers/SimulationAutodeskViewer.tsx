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
        
        if (guids.length === 0) {
          // CRITICAL: Hide ALL elements for true 4D simulation
          // This ensures Day 1 starts with empty model
          console.log('[SimulationAutodeskViewer] Hiding ALL elements')
          viewer.hideAll()
        } else {
          // Hide specific elements by dbId
          const dbIds = guidsToDbIds(guids)
          if (dbIds.length > 0) {
            viewer.hide(dbIds)
          }
        }
        
        // CRITICAL: Force immediate viewer refresh for recording
        // This ensures the hide operation is captured in the current frame
        try {
          viewer.impl.invalidate(true, true, true)
          // Additional force render to ensure changes are visible
          viewer.impl.sceneUpdated(true)
        } catch (e) {
          // Ignore errors
        }
      },

      showObjects: (guids: string[]) => {
        if (!viewerRef.current) return
        const viewer = viewerRef.current
        const dbIds = guidsToDbIds(guids)
        
        if (dbIds.length > 0) {
          console.log('[SimulationAutodeskViewer] Showing', dbIds.length, 'elements')
          viewer.show(dbIds)
        }
        
        // CRITICAL: Force immediate viewer refresh for recording
        // This ensures the show operation is captured in the current frame
        try {
          viewer.impl.invalidate(true, true, true)
          // Additional force render to ensure changes are visible
          viewer.impl.sceneUpdated(true)
        } catch (e) {
          // Ignore errors
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
          let failedCount = 0
          const failedReasons: string[] = []
          
          // Test first item in detail
          if (filter.multiple.length > 0) {
            const testItem = filter.multiple[0]
            console.log('[SimulationAutodeskViewer] 🔍 Testing first item:', {
              guid: testItem.property?.value,
              color: testItem.color,
              hasProperty: !!testItem.property,
              hasColor: !!testItem.color
            })
          }
          
          for (const item of filter.multiple) {
            const guid = item.property?.value
            if (!guid) {
              failedCount++
              failedReasons.push('No GUID')
              continue
            }
            
            // Try to get dbId from map, or parse guid as number directly
            let dbId = guidToDbIdMap.current.get(guid)
            if (dbId === undefined) {
              // Try parsing as number (guid might be a dbId string)
              const parsed = parseInt(guid)
              if (!isNaN(parsed)) {
                dbId = parsed
              }
            }
            
            if (dbId === undefined || isNaN(dbId)) {
              failedCount++
              if (failedReasons.length < 3) {
                failedReasons.push(`GUID ${guid} not found`)
              }
              continue
            }
            
            try {
              const color = hexToColor(item.color)
              if (!color) {
                failedCount++
                if (failedReasons.length < 3) {
                  failedReasons.push(`Invalid color ${item.color}`)
                }
                continue
              }
              
              // Test: Log first successful color application
              if (appliedCount === 0) {
                console.log('[SimulationAutodeskViewer] 🎨 First color application:', {
                  dbId,
                  hexColor: item.color,
                  convertedColor: color,
                  colorType: color.constructor.name
                })
              }
              
              // CRITICAL: Use recursive=true to apply to all fragments
              viewer.setThemingColor(dbId, color, viewer.model, true)
              appliedCount++
            } catch (e) {
              failedCount++
              if (failedReasons.length < 3) {
                failedReasons.push(`Error: ${e instanceof Error ? e.message : 'Unknown'}`)
              }
              console.error('[SimulationAutodeskViewer] Error applying color to dbId', dbId, ':', e)
            }
          }
          
          console.log('[SimulationAutodeskViewer] Applied colors to', appliedCount, 'elements')
          if (failedCount > 0) {
            console.warn('[SimulationAutodeskViewer] ⚠️ Failed to apply', failedCount, 'colors. Reasons:', failedReasons)
          }
          
          // CRITICAL: Force multiple viewer refreshes to ensure colors are visible
          try {
            // CRITICAL FIX: Set display mode to enable theming colors
            viewer.setDisplayEdges(false) // Disable edges for better color visibility
            viewer.setGroundShadow(false) // Disable shadows
            viewer.setGroundReflection(false) // Disable reflections
            viewer.setEnvMapBackground(false) // Disable environment map
            
            // Enable ghosting to make theming colors more visible
            viewer.setGhosting(false) // Disable ghosting for solid colors
            
            // Force material override mode
            if (viewer.impl && viewer.impl.matman) {
              viewer.impl.matman().setDoNotCut(true)
            }
            
            // Method 1: Invalidate with all flags
            viewer.impl.invalidate(true, true, true)
            
            // Method 2: Force scene update
            viewer.impl.sceneUpdated(true)
            
            // Method 3: Request animation frame render
            requestAnimationFrame(() => {
              viewer.impl.invalidate(true, true, true)
              
              // Force another render after a short delay
              setTimeout(() => {
                viewer.impl.invalidate(true, true, true)
              }, 100)
            })
            
            console.log('[SimulationAutodeskViewer] 🎨 Forced viewer refresh for color visibility')
          } catch (e) {
            console.warn('[SimulationAutodeskViewer] Could not force refresh:', e)
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
              // Check if container exists and has dimensions
              if (!containerRef.current) {
                console.error('[SimulationAutodeskViewer] Container ref is null')
                setError('Viewer container not found')
                setLoading(false)
                return
              }

              const container = containerRef.current
              const rect = container.getBoundingClientRect()
              
              if (rect.width === 0 || rect.height === 0) {
                console.error('[SimulationAutodeskViewer] Container has no dimensions:', rect)
                setError('Viewer container has no dimensions')
                setLoading(false)
                return
              }

              console.log('[SimulationAutodeskViewer] Container dimensions:', rect.width, 'x', rect.height)
              
              viewerInstance = new Autodesk.Viewing.GuiViewer3D(container)
              
              if (!viewerInstance || typeof viewerInstance.start !== 'function') {
                console.error('[SimulationAutodeskViewer] Failed to create viewer instance')
                setError('Failed to create viewer')
                setLoading(false)
                return
              }
              
              const startCode = viewerInstance.start()
              if (startCode > 0) {
                console.error('[SimulationAutodeskViewer] Viewer start failed with code:', startCode)
                setError('Failed to start viewer')
                setLoading(false)
                return
              }
              
              // CRITICAL: Enable theming for color visualization
              viewerInstance.setThemingColor = viewerInstance.setThemingColor || function() {}
              viewerInstance.clearThemingColors = viewerInstance.clearThemingColors || function() {}
              
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

                  // Set canvas ref with WebGL context recovery
                  if (viewerCanvasRef && containerRef.current) {
                    const canvas = containerRef.current.querySelector('canvas')
                    if (canvas) {
                      viewerCanvasRef.current = canvas as HTMLCanvasElement
                      
                      // Add WebGL context lost/restored handlers
                      canvas.addEventListener('webglcontextlost', (event) => {
                        event.preventDefault()
                        console.error('⚠️ [Autodesk] WebGL context lost! Attempting recovery...')
                        setError('WebGL context lost. Please refresh the page.')
                      }, false)

                      canvas.addEventListener('webglcontextrestored', () => {
                        console.log('✅ [Autodesk] WebGL context restored!')
                        setError(null)
                        // Autodesk viewer will handle its own recovery
                      }, false)
                      
                      console.log('[SimulationAutodeskViewer] Canvas ref set with WebGL recovery handlers')
                    }
                  }

                  // Start continuous render loop for smooth recording
                  // This ensures the viewer updates every frame during 4D simulation
                  let renderLoopId: number
                  const continuousRender = () => {
                    if (viewerInstance && viewerInstance.impl) {
                      try {
                        // Force viewer to render continuously
                        viewerInstance.impl.invalidate(true, true, true)
                      } catch (e) {
                        // Ignore errors
                      }
                    }
                    renderLoopId = requestAnimationFrame(continuousRender)
                  }
                  continuousRender()
                  
                  console.log('[SimulationAutodeskViewer] 🎬 Continuous render loop started for recording')

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
