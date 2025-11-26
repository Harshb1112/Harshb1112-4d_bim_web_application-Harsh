 /* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Link2,
  RefreshCw,
  TreePine,
  Box,
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import type * as THREE from 'three'


interface SpeckleViewerProps {
  project?: any
  onElementSelect?: (elementId: string, element: any) => void
  selectedElements?: string[]
  onConnectionChange?: (connected: boolean, elements: any[], info: any) => void
  sectionPlaneActive?: boolean
  measurementActive?: boolean
  filterProperties?: { [key: string]: string | number | boolean }
  isolateElements?: string[]
  hideElements?: string[]
  viewerCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>
}

interface SpeckleObject {
  id: string
  speckle_type: string
  name?: string
  children?: SpeckleObject[]
  displayValue?: any
  [key: string]: any
}

export interface SpeckleViewerRef {
  setColorFilter: (filter: any) => void
  resetFilters: () => void
  isolateObjects: (ids: string[], ghost?: boolean) => void
  unIsolateObjects: () => void
  hideObjects: (ids: string[]) => void
  showObjects: (ids: string[]) => void
  loadObject: (commitId: string) => Promise<void>
  setSectionPlane: (active: boolean) => void
  setMeasurementMode: (active: boolean) => void
  applyFilter: (property: string, value: string | number | boolean) => void
  clearFilter: () => void
  setColorByProperty: (propertyName: string, colorMap: { [value: string]: string }, defaultColor?: string) => void
}

const SpeckleViewer = forwardRef<SpeckleViewerRef, SpeckleViewerProps>(({
  project,
  onElementSelect,
  selectedElements = [],
  onConnectionChange,
  sectionPlaneActive,
  measurementActive,
  filterProperties,
  isolateElements,
  hideElements,
  viewerCanvasRef
}, ref) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const autoConnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [viewerReady, setViewerReady] = useState(false)

  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [useIframe, setUseIframe] = useState(false) // Use built-in viewer by default

  // 🔥 HARDCODED DEFAULT VALUES - Always available!
  const DEFAULT_TOKEN = '78d6ba5bbbae5e70b4bf4e6c63981a9ae67d033a69'
  const DEFAULT_STREAM_ID = '6ee15b2a29'
  const DEFAULT_SERVER_URL = 'https://app.speckle.systems'

  const [streamId, setStreamId] = useState(DEFAULT_STREAM_ID)
  const [token, setToken] = useState(DEFAULT_TOKEN)
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL)
  
  // Auto-load from project speckleUrl (override defaults if available)
  useEffect(() => {
    console.log('🔄 Project changed, resetting auto-connect state')
    // Reset auto-connect when project changes
    setAutoConnectAttempted(false);
    setIsConnected(false);
    
    if (project?.speckleUrl) {
      try {
        // Parse Speckle URL: https://app.speckle.systems/projects/6ee15b2a29/models/f0db2b6cfa
        const url = new URL(project.speckleUrl)
        setServerUrl(url.origin)
        
        const pathParts = url.pathname.split('/')
        const projectIndex = pathParts.indexOf('projects')
        
        if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
          setStreamId(pathParts[projectIndex + 1])
          console.log('✅ Auto-loaded Stream ID from project URL:', pathParts[projectIndex + 1])
        }
      } catch (error) {
        console.error('Failed to parse Speckle URL:', error)
      }
    }
    console.log('✅ Using Speckle credentials - Token:', token.slice(0, 10) + '...', 'Stream ID:', streamId)
  }, [project?.id, project?.speckleUrl])

  const [showProjectTree, setShowProjectTree] = useState(true)
  const [projectData, setProjectData] = useState<SpeckleObject | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false)

  // Reset auto-connect on component mount
  useEffect(() => {
    console.log('🎬 Component mounted, resetting auto-connect state')
    setAutoConnectAttempted(false)
  }, [])

  // Auto-connect when viewer becomes ready
  useEffect(() => {
    console.log('🔍 Auto-connect check (viewerReady changed):', {
      autoConnectAttempted,
      isConnected,
      useIframe,
      hasStreamId: !!streamId,
      hasToken: !!token,
      viewerReady,
      hasViewerRef: !!viewerRef.current
    })
    
    // Clear any existing timer
    if (autoConnectTimerRef.current) {
      console.log('🧹 Clearing previous auto-connect timer')
      clearTimeout(autoConnectTimerRef.current)
      autoConnectTimerRef.current = null
    }
    
    // Trigger auto-connect when viewer becomes ready
    if (viewerReady && !autoConnectAttempted && !isConnected && !useIframe && streamId && token) {
      console.log('✅ All conditions met for auto-connect!')
      setAutoConnectAttempted(true)
      console.log('🚀 Auto-connecting to Speckle (viewer ready)...')
      toast.info('Auto-connecting to Speckle...', { duration: 2000 })
      
      // Call connectToSpeckle directly without timer to avoid Fast Refresh cancellation
      console.log('⏰ Calling connectToSpeckle immediately...')
      if (viewerRef.current) {
        connectToSpeckle().catch(err => {
          console.error('❌ Auto-connect failed:', err)
          toast.error('Auto-connect failed. Please try manual connect.')
        })
      } else {
        console.error('❌ viewerRef.current is null')
      }
    }
    
    // Cleanup function - only clear timer if component unmounts
    return () => {
      if (autoConnectTimerRef.current) {
        console.log('🧹 Component unmounting, clearing auto-connect timer')
        clearTimeout(autoConnectTimerRef.current)
        autoConnectTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerReady, autoConnectAttempted, isConnected, useIframe, streamId, token])

  useImperativeHandle(ref, () => ({
    setColorFilter: (filter) => viewerRef.current?.setColorFilter(filter),
    resetFilters: () => viewerRef.current?.resetFilters(),
    isolateObjects: (ids, ghost = true) => viewerRef.current?.isolateObjects(ids, null, null, ghost),
    unIsolateObjects: () => viewerRef.current?.unIsolateObjects(),
    hideObjects: (ids) => viewerRef.current?.hideObjects(ids),
    showObjects: (ids) => viewerRef.current?.showObjects(ids),
    loadObject: async (commitId: string) => {
      if (!viewerRef.current || !isConnected) return
      toast.info(`Loading new commit: ${commitId.slice(0, 8)}...`)
      const resourceUrl = `${serverUrl}/streams/${streamId}/commits/${commitId}`
      await viewerRef.current.unloadAll()
      await viewerRef.current.loadObject(resourceUrl, token)
    },
    setSectionPlane: (active: boolean) => {
      if (viewerRef.current) {
        viewerRef.current.sectionPlane.enabled = active
        if (!active) {
          viewerRef.current.sectionPlane.display.visible = false
        }
      }
    },
    setMeasurementMode: (active: boolean) => {
      if (viewerRef.current) {
        viewerRef.current.measureVolatile = active
      }
    },
    applyFilter: (property: string, value: string | number | boolean) => {
      if (viewerRef.current) {
        viewerRef.current.applyFilter({
          property: property,
          value: value,
          operation: 'equals',
          ghost: true,
          isolate: true
        })
      }
    },
    clearFilter: () => {
      if (viewerRef.current) {
        viewerRef.current.resetFilters()
      }
    },
    setColorByProperty: (propertyName: string, colorMap: { [value: string]: string }, defaultColor: string = '#CCCCCC') => {
      if (!viewerRef.current) return

      const allObjects = viewerRef.current.getCurrentObjects()
      const colorFilters: any[] = []

      allObjects.forEach((obj: any) => {
        const propertyValue = obj.userData?.parameters?.[propertyName] || obj.userData?.[propertyName]
        const color = colorMap[propertyValue] || defaultColor
        colorFilters.push({ property: { key: 'id', value: obj.id }, color })
      })

      viewerRef.current.setColorFilter({
        property: 'id',
        multiple: colorFilters,
        default_color: defaultColor,
      })
    }
  }))

  useEffect(() => {
  console.log('🔧 Viewer initialization effect triggered')
  
  // Clean up existing viewer when switching modes
  if (viewerRef.current) {
    try {
      if (viewerRef.current.dispose) {
        viewerRef.current.dispose();
      }
    } catch (err) {
      console.warn('Error disposing viewer:', err);
    }
    viewerRef.current = null;
    setViewerReady(false);
  }

  // IMPORTANT: Reset auto-connect flag when viewer is being re-initialized
  console.log('🔄 Resetting autoConnectAttempted to false')
  setAutoConnectAttempted(false);

  // Don't initialize viewer if using iframe mode
  if (useIframe || !viewerContainerRef.current) return;

  const initViewer = async () => {
    setViewerReady(false);
    try {
      // Use Three.js directly instead of Speckle viewer to avoid Extension errors
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

      const el = viewerContainerRef.current as HTMLElement;
      if (!el) {
        console.warn('Viewer container not available');
        return;
      }
      
      // Create Three.js scene with Speckle-like background
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x2a2a2a); // Dark grey like Speckle
      
      // Camera with better initial position
      const camera = new THREE.PerspectiveCamera(
        60, // Slightly narrower FOV for better perspective
        el.clientWidth / el.clientHeight,
        0.1,
        100000 // Larger far plane for big models
      );
      camera.position.set(100, 100, 100);
      
      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.shadowMap.enabled = true;
      el.appendChild(renderer.domElement);
      
      // Lights - better lighting for visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(100, 100, 50);
      directionalLight1.castShadow = true;
      scene.add(directionalLight1);
      
      // Add another light from opposite side
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-100, 50, -50);
      scene.add(directionalLight2);
      
      // Grid with darker colors for dark background
      const gridHelper = new THREE.GridHelper(200, 50, 0x555555, 0x333333);
      scene.add(gridHelper);
      
      // Axes helper
      const axesHelper = new THREE.AxesHelper(50);
      scene.add(axesHelper);
      
      // Controls with better settings
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
      
      // Prevent page scroll when using mouse wheel in viewer
      renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      
      // Raycaster for object selection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let selectedObject: any = null;
      
      const onMouseClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // Reset previous selection
        if (selectedObject) {
          if (selectedObject.material && selectedObject.material.emissive) {
            selectedObject.material.emissive.setHex(0x000000);
          }
        }
        
        if (intersects.length > 0) {
          const object = intersects[0].object;
          if (object instanceof THREE.Mesh) {
            selectedObject = object;
            // Highlight selected object
            if (object.material && object.material.emissive) {
              object.material.emissive.setHex(0x555555);
            }
            
            // Call onElementSelect callback if provided
            if (onElementSelect) {
              onElementSelect(object.uuid, {
                name: object.name,
                type: object.type,
                position: object.position,
                userData: object.userData
              });
            }
            
            console.log('Selected object:', object.name);
          }
        }
      };
      
      renderer.domElement.addEventListener('click', onMouseClick);
      
      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      
      // Handle resize
      const handleResize = () => {
        if (!el) return;
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(el.clientWidth, el.clientHeight);
      };
      window.addEventListener('resize', handleResize);
      
      // Store viewer reference with all required methods
      viewerRef.current = {
        scene,
        camera,
        renderer,
        controls,
        gridHelper,
        axesHelper,
        dispose: () => {
          window.removeEventListener('resize', handleResize);
          renderer.domElement.removeEventListener('click', onMouseClick);
          controls.dispose();
          renderer.dispose();
          if (el.contains(renderer.domElement)) {
            el.removeChild(renderer.domElement);
          }
        },
        unloadAll: async () => {
          // Remove all meshes from scene except grid and axes
          const objectsToRemove: any[] = [];
          scene.children.forEach((child: any) => {
            const isGridOrAxes = child === gridHelper || child === axesHelper;
            if (!isGridOrAxes && (child.type === 'Mesh' || child.type === 'Group')) {
              objectsToRemove.push(child);
            }
          });
          objectsToRemove.forEach((obj) => scene.remove(obj));
        },
        loadObject: async (url: string, token: string) => {
          // This will be called by connectToSpeckle
          return url;
        },
        zoom: () => {
          // Fit all objects in view
          const box = new THREE.Box3();
          scene.children.forEach((child: any) => {
            if (child !== gridHelper && child !== axesHelper) {
              box.expandByObject(child);
            }
          });
          
          if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.5;
            
            const offset = cameraZ * 0.7;
            camera.position.set(
              center.x + offset,
              center.y + offset,
              center.z + offset
            );
            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();
          }
        },
        isolateObjects: (ids: string[]) => {
          // Highlight selected objects (simple implementation)
          console.log('Isolate objects:', ids);
        },
        unIsolateObjects: () => {
          // Remove highlight (simple implementation)
          console.log('Un-isolate objects');
        },
        hideObjects: (ids: string[]) => {
          // Hide objects by making them invisible
          scene.children.forEach((child: any) => {
            if (child.type === 'Mesh' || child.type === 'Group') {
              // Check if this object or any of its children match the IDs
              const checkAndHide = (obj: any) => {
                const matchesId = ids.includes(obj.uuid) || 
                                 ids.includes(obj.name) || 
                                 ids.includes(obj.userData?.speckleId)
                if (matchesId) {
                  obj.visible = false
                }
                if (obj.children) {
                  obj.children.forEach(checkAndHide)
                }
              }
              checkAndHide(child)
            }
          })
        },
        showObjects: (ids: string[]) => {
          // Show objects by making them visible
          scene.children.forEach((child: any) => {
            if (child.type === 'Mesh' || child.type === 'Group') {
              const checkAndShow = (obj: any) => {
                const matchesId = ids.includes(obj.uuid) || 
                                 ids.includes(obj.name) || 
                                 ids.includes(obj.userData?.speckleId)
                if (matchesId) {
                  obj.visible = true
                }
                if (obj.children) {
                  obj.children.forEach(checkAndShow)
                }
              }
              checkAndShow(child)
            }
          })
        },
        showAllObjects: () => {
          // Show all objects
          scene.children.forEach((child: any) => {
            if (child.type === 'Mesh' || child.type === 'Group') {
              const showAll = (obj: any) => {
                obj.visible = true
                if (obj.children) {
                  obj.children.forEach(showAll)
                }
              }
              showAll(child)
            }
          })
        },
        resetFilters: () => {
          // Reset all materials to default
          scene.children.forEach((child: any) => {
            if (child.type === 'Mesh' || child.type === 'Group') {
              const resetMaterial = (obj: any) => {
                if (obj.material) {
                  obj.material.color.setHex(0xCCCCCC) // Default grey
                  obj.material.opacity = 1.0
                  obj.material.transparent = false
                }
                if (obj.children) {
                  obj.children.forEach(resetMaterial)
                }
              }
              resetMaterial(child)
            }
          })
        },
        setColorFilter: (filter: any) => {
          // Apply color filters to objects
          if (filter.multiple && Array.isArray(filter.multiple)) {
            // Apply multiple color filters
            filter.multiple.forEach((colorFilter: any) => {
              const targetId = colorFilter.property?.value
              const color = colorFilter.color
              const opacity = colorFilter.opacity !== undefined ? colorFilter.opacity : 1.0
              
              if (targetId && color) {
                scene.children.forEach((child: any) => {
                  if (child.type === 'Mesh' || child.type === 'Group') {
                    const applyColor = (obj: any) => {
                      // Match by UUID, name, or Speckle ID
                      const matchesId = obj.uuid === targetId || 
                                       obj.name === targetId || 
                                       obj.userData?.speckleId === targetId
                      if (matchesId) {
                        if (obj.material) {
                          obj.material.color.setHex(parseInt(color.replace('#', '0x')))
                          obj.material.opacity = opacity
                          obj.material.transparent = opacity < 1.0
                        }
                      }
                      if (obj.children) {
                        obj.children.forEach(applyColor)
                      }
                    }
                    applyColor(child)
                  }
                })
              }
            })
          }
          
          // Apply default color to unmatched objects
          if (filter.default_color) {
            const defaultColor = filter.default_color
            scene.children.forEach((child: any) => {
              if (child.type === 'Mesh' || child.type === 'Group') {
                const applyDefault = (obj: any) => {
                  // Only apply if not already colored
                  const isColored = filter.multiple?.some((cf: any) => {
                    const targetId = cf.property?.value
                    return obj.uuid === targetId || 
                           obj.name === targetId || 
                           obj.userData?.speckleId === targetId
                  })
                  if (!isColored && obj.material) {
                    obj.material.color.setHex(parseInt(defaultColor.replace('#', '0x')))
                    obj.material.opacity = 0.3 // Ghost unmatched elements
                    obj.material.transparent = true
                  }
                  if (obj.children) {
                    obj.children.forEach(applyDefault)
                  }
                }
                applyDefault(child)
              }
            })
          }
        },
        applyFilter: (filter: any) => {
          console.log('Apply filter:', filter);
        }
      };
      
      console.log('✅ Three.js viewer initialized successfully');
      console.log('🎯 Setting viewerReady to true, autoConnectAttempted is:', autoConnectAttempted);
      setViewerReady(true);

    } catch (err) {
      console.error('Viewer initialization error:', err);
      setError("Failed to initialize 3D viewer. Try 'Open in Speckle Website' instead.");
      setViewerReady(false);
    }
  };

  initViewer();

  return () => {
    if (viewerRef.current && viewerRef.current.dispose) {
      try {
        viewerRef.current.dispose();
      } catch (err) {
        console.warn('Error disposing viewer:', err);
      }
      viewerRef.current = null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [useIframe]);


  useEffect(() => {
    if (viewerRef.current && sectionPlaneActive !== undefined) {
      viewerRef.current.sectionPlane.enabled = sectionPlaneActive
      viewerRef.current.sectionPlane.display.visible = sectionPlaneActive
    }
  }, [sectionPlaneActive])

  useEffect(() => {
    if (viewerRef.current && measurementActive !== undefined) {
      viewerRef.current.measureVolatile = measurementActive
    }
  }, [measurementActive])

  useEffect(() => {
    if (viewerRef.current && filterProperties) {
      const { property, value } = filterProperties
      if (property && value !== undefined) {
        viewerRef.current.applyFilter({
          property: property,
          value: value,
          operation: 'equals',
          ghost: true,
          isolate: true
        })
      } else {
        viewerRef.current.resetFilters()
      }
    }
  }, [filterProperties])

  useEffect(() => {
    if (viewerRef.current) {
      if (isolateElements && isolateElements.length > 0) {
        viewerRef.current.isolateObjects(isolateElements, null, null, true)
      } else if (hideElements && hideElements.length > 0) {
        viewerRef.current.hideObjects(hideElements)
      } else {
        viewerRef.current.unIsolateObjects()
        viewerRef.current.showAllObjects()
      }
    }
  }, [isolateElements, hideElements])

  const connectToSpeckle = async () => {
    console.log('🔌 connectToSpeckle called')
    
    if (!streamId || !token) {
      console.error('❌ Missing credentials:', { hasStreamId: !!streamId, hasToken: !!token })
      setError('Please provide Stream ID and access token')
      return
    }
    
    if (!viewerRef.current || !viewerReady) {
      console.error('❌ Viewer not ready:', { hasViewerRef: !!viewerRef.current, viewerReady })
      setError('Viewer is still initializing. Please wait a moment and try again.')
      toast.error('Viewer not ready yet. Please wait...')
      return
    }
    
    console.log('✅ Starting connection with:', { serverUrl, streamId: streamId.slice(0, 8) + '...' })
    setIsLoading(true)
    setError('')

    try {
      // Use GraphQL API for Speckle 2.0
      const graphqlQuery = {
        query: `
          query Stream($streamId: String!) {
            stream(id: $streamId) {
              id
              name
              commits(limit: 1) {
                items {
                  id
                  referencedObject
                  message
                  createdAt
                }
              }
            }
          }
        `,
        variables: { streamId }
      }

      const commitsResponse = await fetch(`${serverUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphqlQuery)
      })
      
      if (!commitsResponse.ok) {
        const errorText = await commitsResponse.text()
        throw new Error(`Failed to fetch project: ${commitsResponse.status} - ${errorText}`)
      }
      
      const result = await commitsResponse.json()
      
      if (result.errors) {
        throw new Error(`GraphQL Error: ${result.errors[0].message}`)
      }
      
      if (!result.data?.stream?.commits?.items?.length) {
        throw new Error('No commits found in this stream')
      }
      
      const latestCommit = result.data.stream.commits.items[0]

      // Check if viewer is initialized
      if (!viewerRef.current) {
        throw new Error('Viewer not initialized. Try refreshing the page or use "Open in Speckle Website" option.')
      }

      // Unload any existing objects first
      try {
        await viewerRef.current.unloadAll()
      } catch (unloadErr) {
        console.warn('Error unloading previous objects:', unloadErr)
      }
      
      console.log('📦 Loading Speckle data...')
      console.log('Stream ID:', streamId)
      console.log('Object ID:', latestCommit.referencedObject)
      console.log('Server:', serverUrl)
      
      // Load Speckle object data using ObjectLoader
      const ObjectLoader = (await import('@speckle/objectloader')).default
      const THREE = await import('three')
      
      const loader = new ObjectLoader({
        serverUrl,
        streamId,
        objectId: latestCommit.referencedObject,
        token,
      })
      
      console.log('🔄 Fetching object data...')
      const speckleData = await loader.getAndConstructObject((progress: any) => {
        console.log('Loading progress:', Math.round(progress * 100) + '%')
      })
      
      console.log('📦 Raw Speckle data:', speckleData)
      
      const objectData = Array.isArray(speckleData) ? speckleData[0] : speckleData
      
      if (!objectData) {
        throw new Error('No data received from Speckle')
      }
      
      console.log('✅ Speckle data loaded!')
      console.log('Type:', objectData.speckle_type)
      console.log('ID:', objectData.id)
      console.log('Has displayValue:', !!objectData.displayValue)
      console.log('Has children:', Array.isArray(objectData.children) ? objectData.children.length : 0)
      console.log('Has elements:', Array.isArray(objectData.elements) ? objectData.elements.length : 0)
      console.log('Full object keys:', Object.keys(objectData))
      
      // Convert Speckle objects to Three.js meshes
      const convertToThreeMesh = (obj: any, depth = 0): any => {
        if (!obj || depth > 20) return null
        
        if (depth === 0) {
          console.log('🔨 Starting conversion to Three.js meshes...')
        }
        
        const group = new THREE.Group()
        group.name = obj.name || obj.id || 'Object'
        
        console.log(`${'  '.repeat(depth)}Processing: ${group.name} (type: ${obj.speckle_type || 'unknown'})`)
        
        // If object has displayValue (geometry), create mesh
        if (obj.displayValue) {
          const displayValues = Array.isArray(obj.displayValue) ? obj.displayValue : [obj.displayValue]
          
          displayValues.forEach((dv: any, idx: number) => {
            try {
              // Check if it has vertices
              if (dv.vertices && dv.vertices.length > 0) {
                const geometry = new THREE.BufferGeometry()
                
                // Convert vertices (Speckle format: [x1,y1,z1,x2,y2,z2,...])
                const vertices = new Float32Array(dv.vertices)
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
                
                // Convert faces if available
                if (dv.faces && dv.faces.length > 0) {
                  const indices = []
                  let i = 0
                  
                  while (i < dv.faces.length) {
                    const n = dv.faces[i] // number of vertices in this face
                    
                    if (n === 0) {
                      i++
                      continue
                    }
                    
                    if (n === 3) {
                      // Triangle
                      indices.push(dv.faces[i + 1], dv.faces[i + 2], dv.faces[i + 3])
                      i += 4
                    } else if (n === 4) {
                      // Quad - triangulate
                      indices.push(dv.faces[i + 1], dv.faces[i + 2], dv.faces[i + 3])
                      indices.push(dv.faces[i + 1], dv.faces[i + 3], dv.faces[i + 4])
                      i += 5
                    } else {
                      // Skip unknown face types
                      i += n + 1
                    }
                  }
                  
                  if (indices.length > 0) {
                    geometry.setIndex(indices)
                  }
                } else {
                  // No faces - try to create points or lines
                  console.log('No faces, vertices only:', vertices.length / 3, 'points')
                }
                
                geometry.computeVertexNormals()
                geometry.computeBoundingSphere()
                
                // Create material with color
                const color = new THREE.Color(
                  obj.renderMaterial?.diffuse || 
                  dv.renderMaterial?.diffuse || 
                  Math.random() * 0xffffff
                )
                
                const material = new THREE.MeshPhongMaterial({
                  color: color,
                  side: THREE.DoubleSide,
                  flatShading: false,
                  transparent: false
                })
                
                const mesh = new THREE.Mesh(geometry, material)
                // Use Speckle object ID as mesh name for element linking
                mesh.name = obj.id || `${obj.name || 'Mesh'}_${idx}`
                mesh.userData.speckleId = obj.id // Store Speckle ID in userData
                mesh.userData.speckleName = obj.name
                mesh.castShadow = true
                mesh.receiveShadow = true
                group.add(mesh)
                
                console.log(`✅ Created mesh: ${mesh.name}, speckleId: ${obj.id}, vertices: ${vertices.length / 3}`)
              }
            } catch (geomErr) {
              console.warn('Could not create geometry:', geomErr)
            }
          })
        }
        
        // Process children recursively - check multiple possible properties
        const childArrays = [
          obj.elements,
          obj.children, 
          obj['@elements'],
          obj['@displayValue'],
          Array.isArray(obj.displayValue) ? obj.displayValue : null
        ].filter((arr): arr is any[] => Array.isArray(arr) && arr.length > 0)
        
        childArrays.forEach((childArray) => {
          childArray.forEach((child: any) => {
            if (child && typeof child === 'object') {
              const childMesh = convertToThreeMesh(child, depth + 1)
              if (childMesh && childMesh.children.length > 0) {
                group.add(childMesh)
              }
            }
          })
        })
        
        // Also check for nested properties
        Object.keys(obj).forEach((key) => {
          if (key.startsWith('@') && Array.isArray(obj[key])) {
            obj[key].forEach((item: any) => {
              if (item && typeof item === 'object' && item.speckle_type) {
                const childMesh = convertToThreeMesh(item, depth + 1)
                if (childMesh && childMesh.children.length > 0) {
                  group.add(childMesh)
                }
              }
            })
          }
        })
        
        if (depth === 0) {
          console.log(`✅ Conversion complete! Total groups/meshes: ${group.children.length}`)
        }
        
        return group
      }
      
      const threeMesh = convertToThreeMesh(objectData)
      
      if (threeMesh && viewerRef.current.scene) {
        // Calculate bounding box BEFORE adding to scene
        const box = new THREE.Box3().setFromObject(threeMesh)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        // Rotate model 90 degrees to lay it flat on the grid (like in the example image)
        threeMesh.rotation.x = -Math.PI / 2
        
        // After rotation, recalculate bounding box
        const rotatedBox = new THREE.Box3().setFromObject(threeMesh)
        const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3())
        const rotatedSize = rotatedBox.getSize(new THREE.Vector3())
        
        // Center model horizontally and place bottom on grid
        threeMesh.position.set(-rotatedCenter.x, -rotatedBox.min.y, -rotatedCenter.z)
        
        // Now add to scene - model will be flat on grid
        viewerRef.current.scene.add(threeMesh)
        
        const meshCount = threeMesh.children.length
        console.log(`✅ Model added to scene! Total objects: ${meshCount}`)
        
        const maxDim = Math.max(rotatedSize.x, rotatedSize.y, rotatedSize.z)
        const fov = viewerRef.current.camera.fov * (Math.PI / 180)
        const cameraDistance = Math.abs(maxDim / Math.tan(fov / 2)) * 0.8 // Much closer view
        
        // Position camera at isometric angle (45 degrees)
        const angle = Math.PI / 4
        viewerRef.current.camera.position.set(
          cameraDistance * Math.cos(angle),
          cameraDistance * 0.6,
          cameraDistance * Math.sin(angle)
        )
        viewerRef.current.camera.lookAt(0, rotatedSize.y / 3, 0)
        
        // Update camera near/far planes for large models
        viewerRef.current.camera.near = maxDim / 100
        viewerRef.current.camera.far = maxDim * 100
        viewerRef.current.camera.updateProjectionMatrix()
        
        // Update controls target
        if (viewerRef.current.controls) {
          viewerRef.current.controls.target.set(0, rotatedSize.y / 3, 0)
          viewerRef.current.controls.update()
        }
        
        console.log(`📐 Model bounds - Size: ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)}`)
        console.log(`� Model cpentered at origin, bottom on grid`)
        console.log(`📷 Camera distance: ${cameraDistance.toFixed(1)}`)
        
        // Store project data for tree view
        setProjectData(objectData as SpeckleObject)
        setExpandedNodes(new Set<string>([String(objectData.id)]))
        
        toast.success(`Model loaded! ${meshCount} objects visible`)
      } else {
        console.warn('⚠️ No geometry found in Speckle data')
        toast.warning('Model loaded but no visible geometry found. Check console for details.')
      }
      
      // Fetch object data for the tree view (only if not using iframe)
      if (!useIframe) {
        try {
          const ObjectLoader = (await import('@speckle/objectloader')).default
          const loader = new ObjectLoader({
            serverUrl,
            streamId,
            objectId: latestCommit.referencedObject,
            token,
          })
          
          const raw = await loader.getAndConstructObject((progress: any) => {
            console.log('Loading tree data progress:', progress)
          })
          
          const objectData = Array.isArray(raw) ? raw[0] : raw
          
          if (objectData && objectData.id) {
            setProjectData(objectData as SpeckleObject)
            setExpandedNodes(new Set<string>([String(objectData.id)]))
            console.log('✅ Project tree data loaded:', objectData.speckle_type)
          }
        } catch (treeErr) {
          console.warn('Could not load project tree data:', treeErr)
          // Don't fail the whole connection if tree loading fails
        }
      }
      
      setIsConnected(true)
      toast.success('3D model loaded successfully!')


    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect'
      console.error('❌ Speckle connection error:', message, err)
      
      // Check if it's the known library error
      if (message.includes('Extension') || message.includes('Oa')) {
        setError('Built-in viewer has compatibility issues. Please use External Viewer (toggle above).')
        toast.error('Built-in viewer not compatible. Use External Viewer instead.', {
          duration: 5000
        })
      } else {
        setError(message)
        toast.error(`Failed to load model: ${message}`)
      }
      
      setIsConnected(false)
      
      if (onConnectionChange) onConnectionChange(false, [], {})
    } finally {
      setIsLoading(false)
    }
  }


  const disconnectSpeckle = async () => {
    await viewerRef.current?.unloadAll()
    setIsConnected(false)
    setProjectData(null)
    setAutoConnectAttempted(false) // Reset so auto-connect can work again
    if (onConnectionChange) onConnectionChange(false, [], {})
  }

  const handleObjectSelect = (obj: SpeckleObject) => {
    if (onElementSelect) onElementSelect(obj.id, obj)
    viewerRef.current?.isolateObjects([obj.id])
    setTimeout(() => viewerRef.current?.unIsolateObjects(), 2000)
  }

  const renderTreeNode = (obj: SpeckleObject, depth = 0) => {
    if (!obj || depth > 10) return null
    const hasChildren = obj.children && obj.children.length > 0
    const isExpanded = expandedNodes.has(obj.id)
    const isSelected = selectedElements.includes(obj.id)

    return (
      <div key={obj.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer ${isSelected ? 'bg-blue-100' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleObjectSelect(obj)}
        >
          {hasChildren && (
            <button onClick={(e) => { e.stopPropagation(); toggleNodeExpansion(obj.id) }} className="mr-1 p-1">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          <Box className="h-3 w-3 mr-2 text-gray-500" />
          <span className="text-sm truncate">{obj.name || obj.speckle_type || `Object ${obj.id.slice(0, 8)}`}</span>
        </div>
        {hasChildren && isExpanded && obj.children!.map(child => renderTreeNode(child, depth + 1))}
      </div>
    )
  }

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) newSet.delete(nodeId)
      else newSet.add(nodeId)
      return newSet
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      <div className={`space-y-4 ${showProjectTree ? 'lg:col-span-1' : 'lg:col-span-1'}`}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <Link2 className="h-4 w-4 mr-2" />Speckle Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="serverUrl" className="text-xs">Server URL</Label>
              <Input id="serverUrl" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} disabled={isConnected} className="text-xs" />
            </div>
            <div>
              <Label htmlFor="streamId" className="text-xs">Stream ID</Label>
              <Input id="streamId" value={streamId} onChange={(e) => setStreamId(e.target.value)} disabled={isConnected} className="text-xs" />
            </div>
            <div>
              <Label htmlFor="token" className="text-xs">Access Token</Label>
              <Input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} disabled={isConnected} className="text-xs" />
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <div className="flex space-x-2">
              {!isConnected ? (
                <Button onClick={connectToSpeckle} disabled={isLoading || !streamId || !token || (!viewerReady && !useIframe)} size="sm" className="flex-1 text-xs">
                  {isLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
                  {isLoading ? 'Connecting...' : !viewerReady && !useIframe ? 'Initializing...' : 'Connect'}
                </Button>
              ) : (
                <Button onClick={disconnectSpeckle} variant="outline" size="sm" className="flex-1 text-xs">Disconnect</Button>
              )}
            </div>
            <Separator />
            {project?.speckleUrl && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="iframeMode" className="text-xs">Open in Speckle Website</Label>
                  <Switch 
                    id="iframeMode" 
                    checked={useIframe} 
                    onCheckedChange={(checked) => {
                      console.log('🔄 Switching viewer mode:', checked ? 'External Link' : 'Built-in')
                      
                      // Disconnect current viewer first
                      if (viewerRef.current) {
                        try {
                          viewerRef.current.unloadAll()
                        } catch (err) {
                          console.warn('Error unloading:', err)
                        }
                      }
                      
                      setUseIframe(checked)
                      setIsConnected(false)
                      setError('')
                      setAutoConnectAttempted(false)
                      setProjectData(null)
                      setViewerReady(false)
                      
                      // If switching to external viewer, mark as "connected"
                      if (checked) {
                        setTimeout(() => {
                          setIsConnected(true)
                          setError('')
                        }, 100)
                      }
                    }} 
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {useIframe ? 'Opens model in new tab (Speckle blocks embedding)' : 'View model directly in this page'}
                </p>
                <Separator />
              </>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="projectTree" className="text-xs">Project Tree</Label>
              <Switch id="projectTree" checked={showProjectTree} onCheckedChange={setShowProjectTree} disabled={!isConnected || useIframe} />
            </div>
          </CardContent>
        </Card>
        {showProjectTree && isConnected && projectData && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <TreePine className="h-4 w-4 mr-2" />Project Tree
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto border-t">{renderTreeNode(projectData)}</div>
            </CardContent>
          </Card>
        )}
      </div>
      <div className={`${showProjectTree && isConnected ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
        <Card className="h-[600px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm">
                <Layers className="h-4 w-4 mr-2" />Speckle 3D Viewer
              </CardTitle>
              {isConnected && <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Connected</span>}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            {useIframe && project?.speckleUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 m-6 mt-0 rounded-lg">
                <div className="text-center max-w-md p-8">
                  <Layers className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">View in Speckle</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Speckle models cannot be embedded directly due to security restrictions.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => window.open(project.speckleUrl, '_blank')}
                      size="lg"
                      className="w-full"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Open Model in Speckle
                    </Button>
                    <Button 
                      onClick={() => {
                        setUseIframe(false)
                        setError('')
                        setIsConnected(false)
                        setAutoConnectAttempted(false)
                        setViewerReady(false)
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      Use Built-in 3D Viewer
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Or use the built-in viewer to view the model directly in this page
                  </p>
                </div>
              </div>
            ) : useIframe && !project?.speckleUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 m-6 mt-0 rounded-lg">
                <div className="text-center max-w-md p-8">
                  <Layers className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Speckle URL</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Add a Speckle URL to your project settings to view the 3D model.
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Example: https://app.speckle.systems/projects/YOUR_ID/models/YOUR_MODEL
                  </p>
                  <Button 
                    onClick={() => {
                      setUseIframe(false)
                      setError('')
                      setIsConnected(false)
                      setViewerReady(false)
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Switch to Built-in Viewer
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                ref={(el) => {
                  viewerContainerRef.current = el
                  // Also set the canvas ref if provided (for 4D Simulation)
                  if (viewerCanvasRef && el) {
                    const canvas = el.querySelector('canvas')
                    if (canvas) viewerCanvasRef.current = canvas
                  }
                }} 
                className="w-full h-full bg-gray-800 rounded-b-lg" 
                style={{ 
                  minHeight: '500px', 
                  height: '500px', 
                  position: 'relative',
                  overflow: 'hidden',
                  touchAction: 'none'
                }} 
              />
            )}
            {!isConnected && !useIframe && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 m-6 mt-0">
                <div className="text-center text-gray-500 max-w-md">
                  <Link2 className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to View Model</h3>
                  <p className="text-sm mb-4 text-gray-600">
                    {project?.speckleUrl ? (
                      <>Click "Connect" above to load your 3D model</>
                    ) : (
                      <>Add a Speckle URL to your project settings first</>
                    )}
                  </p>
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>⚠️ Error:</strong> {error}
                      <div className="mt-3 space-y-2">
                        <Button 
                          onClick={() => {
                            setUseIframe(true)
                            setError('')
                            setIsConnected(true)
                            setViewerReady(false)
                          }}
                          size="sm"
                          className="w-full"
                        >
                          <Link2 className="h-3 w-3 mr-2" />
                          Open in Speckle Website Instead
                        </Button>
                        <p className="text-xs text-gray-600">
                          This will open your model in a new tab
                        </p>
                      </div>
                    </div>
                  )}
                  {!error && project?.speckleUrl && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      <strong>💡 Tip:</strong> If the viewer doesn't load, use the "Open in Speckle Website" toggle above.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

SpeckleViewer.displayName = 'SpeckleViewer'
export default SpeckleViewer