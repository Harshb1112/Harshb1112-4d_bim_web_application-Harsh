/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export interface IFCViewerRef {
  isolateObjects: (guids: string[], ghost?: boolean) => void
  unIsolateObjects: () => void
}

interface IFCViewerProps {
  model: any
  onElementSelect?: (elementId: string, element: any) => void
}

const IFCViewer = forwardRef<IFCViewerRef, IFCViewerProps>(({ model, onElementSelect }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const onElementSelectRef = useRef(onElementSelect)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [selectedElementInfo, setSelectedElementInfo] = useState<{ type: string; id: number } | null>(null)

  // Keep callback ref updated without triggering re-render
  useEffect(() => {
    onElementSelectRef.current = onElementSelect
  }, [onElementSelect])

  // Expose methods via ref for external control
  useImperativeHandle(ref, () => ({
    isolateObjects: (guids: string[]) => {
      // IFC viewer isolation - highlight selected elements
      if (viewerRef.current && guids.length > 0) {
        try {
          const viewer = viewerRef.current
          // Try to select/highlight the elements
          const expressIds = guids.map(g => parseInt(g)).filter(id => !isNaN(id))
          if (expressIds.length > 0 && viewer.IFC) {
            // Highlight the elements
            viewer.IFC.selector?.pickIfcItemsByID(0, expressIds, true)
          }
        } catch (e) {
          console.warn('IFC isolation error:', e)
        }
      }
    },
    unIsolateObjects: () => {
      if (viewerRef.current) {
        try {
          const viewer = viewerRef.current
          if (viewer.IFC) {
            viewer.IFC.selector?.unpickIfcItems()
          }
        } catch (e) {
          console.warn('IFC un-isolation error:', e)
        }
      }
    }
  }))

  const fileUrl = model?.fileUrl || model?.filePath || model?.sourceUrl

  // Debug: Log model data
  console.log('[IFCViewer] Model received:', {
    id: model?.id,
    name: model?.name,
    fileUrl: model?.fileUrl,
    filePath: model?.filePath,
    sourceUrl: model?.sourceUrl,
    resolvedUrl: fileUrl
  })

  useEffect(() => {
    if (!fileUrl) {
      setError('No IFC file URL provided')
      setLoading(false)
      return
    }

    if (!containerRef.current) return

    let disposed = false
    let animationId: number

    const initViewer = async () => {
      try {
        setProgress(10)
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        
        setProgress(20)

        const container = containerRef.current
        if (!container || disposed) return
        
        // Scene setup - Dark professional background like Speckle
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x2d2d2d) // Dark gray like Speckle viewer

        // Camera
        const camera = new THREE.PerspectiveCamera(
          60,
          container.clientWidth / container.clientHeight,
          0.1,
          10000
        )
        camera.position.set(50, 50, 50)

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.shadowMap.enabled = true
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2
        container.appendChild(renderer.domElement)

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        // Lights - brighter for dark background
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
        directionalLight.position.set(100, 100, 50)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight2.position.set(-50, 50, -50)
        scene.add(directionalLight2)

        // Hemisphere light for better ambient
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
        scene.add(hemiLight)

        // Grid - dark style like Speckle, will be repositioned after model loads
        const gridHelper = new THREE.GridHelper(200, 40, 0x555555, 0x3a3a3a)
        gridHelper.name = 'grid'
        scene.add(gridHelper)

        // Axes helper - will be repositioned after model loads
        const axesHelper = new THREE.AxesHelper(20)
        axesHelper.name = 'axes'
        scene.add(axesHelper)

        setProgress(40)

        // Raycaster for selection
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        let selectedObject: any = null
        const originalMaterials = new Map<string, any>()

        // Load IFC file and create geometry
        console.log('[IFCViewer] Loading IFC file:', fileUrl)
        
        try {
          const response = await fetch(fileUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch IFC file: ${response.status}`)
          }
          
          setProgress(60)
          const arrayBuffer = await response.arrayBuffer()
          
          setProgress(70)
          
          // Parse IFC using web-ifc
          const WebIFC = await import('web-ifc')
          const ifcApi = new WebIFC.IfcAPI()
          
          console.log('[IFCViewer] Initializing web-ifc...')
          
          // Set WASM path before Init - this tells web-ifc where to find the .wasm files
          ifcApi.SetWasmPath('/wasm/', true) // true = absolute path
          
          // Initialize with custom locateFile handler
          await ifcApi.Init((path: string) => {
            console.log('[IFCViewer] Loading WASM file:', path)
            return `/wasm/${path}`
          })
          
          console.log('[IFCViewer] web-ifc initialized successfully')
          
          setProgress(80)
          
          const modelID = ifcApi.OpenModel(new Uint8Array(arrayBuffer))
          
          // Get all IFC elements
          const allTypes = [
            WebIFC.IFCWALL, WebIFC.IFCWALLSTANDARDCASE,
            WebIFC.IFCSLAB, WebIFC.IFCCOLUMN, WebIFC.IFCBEAM,
            WebIFC.IFCDOOR, WebIFC.IFCWINDOW, WebIFC.IFCROOF,
            WebIFC.IFCSTAIR, WebIFC.IFCRAILING,
            WebIFC.IFCFURNISHINGELEMENT, WebIFC.IFCBUILDINGELEMENTPROXY
          ]
          
          const elementsGroup = new THREE.Group()
          elementsGroup.name = 'IFC_Elements'
          
          for (const ifcType of allTypes) {
            try {
              const ids = ifcApi.GetLineIDsWithType(modelID, ifcType)
              
              for (let i = 0; i < ids.size(); i++) {
                const expressID = ids.get(i)
                
                try {
                  const flatMesh = ifcApi.GetFlatMesh(modelID, expressID)
                  
                  for (let j = 0; j < flatMesh.geometries.size(); j++) {
                    const placedGeometry = flatMesh.geometries.get(j)
                    const geometry = ifcApi.GetGeometry(modelID, placedGeometry.geometryExpressID)
                    
                    const vertexData = ifcApi.GetVertexArray(
                      geometry.GetVertexData(),
                      geometry.GetVertexDataSize()
                    )
                    const indices = ifcApi.GetIndexArray(
                      geometry.GetIndexData(),
                      geometry.GetIndexDataSize()
                    )
                    
                    // web-ifc returns 6 floats per vertex: x, y, z, nx, ny, nz
                    // Extract positions and normals separately
                    const vertexCount = vertexData.length / 6
                    const positions = new Float32Array(vertexCount * 3)
                    const normals = new Float32Array(vertexCount * 3)
                    
                    for (let v = 0; v < vertexCount; v++) {
                      positions[v * 3] = vertexData[v * 6]       // x
                      positions[v * 3 + 1] = vertexData[v * 6 + 1] // y
                      positions[v * 3 + 2] = vertexData[v * 6 + 2] // z
                      normals[v * 3] = vertexData[v * 6 + 3]     // nx
                      normals[v * 3 + 1] = vertexData[v * 6 + 4] // ny
                      normals[v * 3 + 2] = vertexData[v * 6 + 5] // nz
                    }
                    
                    const bufferGeometry = new THREE.BufferGeometry()
                    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
                    bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
                    bufferGeometry.setIndex(Array.from(indices))
                    
                    // Color based on type
                    let color = 0xcccccc
                    if (ifcType === WebIFC.IFCWALL || ifcType === WebIFC.IFCWALLSTANDARDCASE) color = 0xe8e8e8
                    else if (ifcType === WebIFC.IFCSLAB) color = 0xd0d0d0
                    else if (ifcType === WebIFC.IFCCOLUMN) color = 0xb0b0b0
                    else if (ifcType === WebIFC.IFCBEAM) color = 0xa0a0a0
                    else if (ifcType === WebIFC.IFCDOOR) color = 0x8b4513
                    else if (ifcType === WebIFC.IFCWINDOW) color = 0x87ceeb
                    
                    const material = new THREE.MeshPhongMaterial({
                      color,
                      side: THREE.DoubleSide,
                      transparent: true,
                      opacity: 0.9
                    })
                    
                    const mesh = new THREE.Mesh(bufferGeometry, material)
                    
                    // Apply transformation
                    const matrix = new THREE.Matrix4()
                    matrix.fromArray(placedGeometry.flatTransformation)
                    mesh.applyMatrix4(matrix)
                    
                    // Store element info
                    mesh.userData = {
                      expressID,
                      ifcType,
                      typeName: WebIFC.IFCWALL === ifcType ? 'Wall' :
                               WebIFC.IFCSLAB === ifcType ? 'Slab' :
                               WebIFC.IFCCOLUMN === ifcType ? 'Column' :
                               WebIFC.IFCBEAM === ifcType ? 'Beam' :
                               WebIFC.IFCDOOR === ifcType ? 'Door' :
                               WebIFC.IFCWINDOW === ifcType ? 'Window' : 'Element'
                    }
                    mesh.name = `IFC_${expressID}`
                    
                    elementsGroup.add(mesh)
                  }
                } catch (e) {
                  // Skip elements that can't be processed
                }
              }
            } catch (e) {
              // Skip types that don't exist
            }
          }
          
          scene.add(elementsGroup)
          
          // Center camera and grid on model
          const box = new THREE.Box3().setFromObject(elementsGroup)
          if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3())
            const size = box.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z)
            
            // Log model dimensions for debugging
            console.log('[IFCViewer] Model bounds:', {
              center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) },
              size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
              maxDim: maxDim.toFixed(2)
            })
            
            // Calculate optimal camera distance
            const fov = camera.fov * (Math.PI / 180)
            const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8
            
            // Position camera to see entire model
            camera.position.set(
              center.x + cameraDistance * 0.7,
              center.y + cameraDistance * 0.5,
              center.z + cameraDistance * 0.7
            )
            camera.lookAt(center)
            controls.target.copy(center)
            
            // Update camera near/far planes based on model size
            camera.near = maxDim * 0.001
            camera.far = maxDim * 100
            camera.updateProjectionMatrix()
            
            // Reposition grid to model center (at bottom of model) - dark style
            const gridSize = Math.max(maxDim * 1.5, 50)
            scene.remove(gridHelper)
            const newGrid = new THREE.GridHelper(gridSize, 40, 0x555555, 0x3a3a3a)
            newGrid.position.set(center.x, box.min.y - 0.1, center.z)
            newGrid.name = 'grid'
            scene.add(newGrid)
            
            // Reposition axes to model center
            axesHelper.position.set(center.x - gridSize/2, box.min.y, center.z - gridSize/2)
            
            // Force controls update
            controls.update()
          } else {
            console.warn('[IFCViewer] Model bounding box is empty!')
          }
          
          ifcApi.CloseModel(modelID)
          
          setProgress(100)
          setLoading(false)
          console.log('[IFCViewer] IFC loaded successfully with', elementsGroup.children.length, 'elements')
          
        } catch (ifcError: any) {
          console.warn('[IFCViewer] web-ifc loading failed:', ifcError.message)
          
          // Try alternative initialization
          try {
            console.log('[IFCViewer] Trying alternative web-ifc initialization...')
            const WebIFC = await import('web-ifc')
            const ifcApi2 = new WebIFC.IfcAPI()
            
            // Set WASM path with absolute flag
            ifcApi2.SetWasmPath('/wasm/', true)
            
            // Init without custom handler - let it use SetWasmPath
            await ifcApi2.Init()
            
            const response2 = await fetch(fileUrl)
            const arrayBuffer2 = await response2.arrayBuffer()
            const modelID2 = ifcApi2.OpenModel(new Uint8Array(arrayBuffer2))
            
            console.log('[IFCViewer] Alternative init succeeded, model ID:', modelID2)
            
            // Simplified geometry extraction
            const elementsGroup = new THREE.Group()
            elementsGroup.name = 'IFC_Elements'
            
            const allTypes = [
              WebIFC.IFCWALL, WebIFC.IFCWALLSTANDARDCASE,
              WebIFC.IFCSLAB, WebIFC.IFCCOLUMN, WebIFC.IFCBEAM,
              WebIFC.IFCDOOR, WebIFC.IFCWINDOW
            ]
            
            for (const ifcType of allTypes) {
              try {
                const ids = ifcApi2.GetLineIDsWithType(modelID2, ifcType)
                for (let i = 0; i < ids.size(); i++) {
                  const expressID = ids.get(i)
                  try {
                    const flatMesh = ifcApi2.GetFlatMesh(modelID2, expressID)
                    for (let j = 0; j < flatMesh.geometries.size(); j++) {
                      const placedGeometry = flatMesh.geometries.get(j)
                      const geometry = ifcApi2.GetGeometry(modelID2, placedGeometry.geometryExpressID)
                      
                      const vertexData2 = ifcApi2.GetVertexArray(
                        geometry.GetVertexData(),
                        geometry.GetVertexDataSize()
                      )
                      const indices = ifcApi2.GetIndexArray(
                        geometry.GetIndexData(),
                        geometry.GetIndexDataSize()
                      )
                      
                      // Extract positions and normals (6 floats per vertex)
                      const vertexCount2 = vertexData2.length / 6
                      const positions2 = new Float32Array(vertexCount2 * 3)
                      const normals2 = new Float32Array(vertexCount2 * 3)
                      
                      for (let v = 0; v < vertexCount2; v++) {
                        positions2[v * 3] = vertexData2[v * 6]
                        positions2[v * 3 + 1] = vertexData2[v * 6 + 1]
                        positions2[v * 3 + 2] = vertexData2[v * 6 + 2]
                        normals2[v * 3] = vertexData2[v * 6 + 3]
                        normals2[v * 3 + 1] = vertexData2[v * 6 + 4]
                        normals2[v * 3 + 2] = vertexData2[v * 6 + 5]
                      }
                      
                      const bufferGeometry = new THREE.BufferGeometry()
                      bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions2, 3))
                      bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normals2, 3))
                      bufferGeometry.setIndex(Array.from(indices))
                      
                      const material = new THREE.MeshPhongMaterial({
                        color: 0xcccccc,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.9
                      })
                      
                      const mesh = new THREE.Mesh(bufferGeometry, material)
                      const matrix = new THREE.Matrix4()
                      matrix.fromArray(placedGeometry.flatTransformation)
                      mesh.applyMatrix4(matrix)
                      mesh.userData = { expressID, ifcType }
                      mesh.name = `IFC_${expressID}`
                      elementsGroup.add(mesh)
                    }
                  } catch (e) { /* skip */ }
                }
              } catch (e) { /* skip */ }
            }
            
            scene.add(elementsGroup)
            
            const box = new THREE.Box3().setFromObject(elementsGroup)
            if (!box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              camera.position.set(center.x + maxDim, center.y + maxDim, center.z + maxDim)
              camera.lookAt(center)
              controls.target.copy(center)
            }
            
            ifcApi2.CloseModel(modelID2)
            setProgress(100)
            setLoading(false)
            console.log('[IFCViewer] Alternative loading succeeded with', elementsGroup.children.length, 'elements')
            
          } catch (altError: any) {
            console.warn('[IFCViewer] Alternative init also failed:', altError.message)
            
            // Create placeholder geometry as last resort
            const geometry = new THREE.BoxGeometry(20, 10, 15)
            const material = new THREE.MeshPhongMaterial({ color: 0x4a90d9 })
            const placeholder = new THREE.Mesh(geometry, material)
            placeholder.position.set(0, 5, 0)
            placeholder.userData = { expressID: 1, typeName: 'Building' }
            placeholder.name = 'IFC_placeholder'
            scene.add(placeholder)
            
            camera.position.set(40, 30, 40)
            camera.lookAt(0, 5, 0)
            controls.target.set(0, 5, 0)
            
            setProgress(100)
            setLoading(false)
            setError(`IFC parsing unavailable: ${altError.message}. Showing placeholder.`)
          }
        }

        // Click handler for selection
        const onClick = (event: MouseEvent) => {
          const rect = renderer.domElement.getBoundingClientRect()
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

          raycaster.setFromCamera(mouse, camera)
          const intersects = raycaster.intersectObjects(scene.children, true)

          // Reset previous selection
          if (selectedObject) {
            const originalMat = originalMaterials.get(selectedObject.uuid)
            if (originalMat) {
              selectedObject.material = originalMat
            }
            selectedObject = null
          }

          // Find first mesh intersection
          for (const intersect of intersects) {
            if (intersect.object instanceof THREE.Mesh && intersect.object.userData.expressID) {
              selectedObject = intersect.object
              
              // Store original material
              originalMaterials.set(selectedObject.uuid, selectedObject.material)
              
              // Highlight
              selectedObject.material = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                emissive: 0x003300,
                side: THREE.DoubleSide
              })
              
              const elementId = `IFC_${selectedObject.userData.expressID}`
              setSelectedElement(elementId)
              setSelectedElementInfo({
                type: selectedObject.userData.typeName || 'Element',
                id: selectedObject.userData.expressID
              })
              
              // Call callback using ref to avoid re-renders
              if (onElementSelectRef.current) {
                onElementSelectRef.current(elementId, {
                  id: elementId,
                  expressID: selectedObject.userData.expressID,
                  type: selectedObject.userData.typeName,
                  name: selectedObject.name,
                  userData: selectedObject.userData
                })
              }
              
              console.log('[IFCViewer] Selected:', selectedObject.userData)
              break
            }
          }
        }

        renderer.domElement.addEventListener('click', onClick)

        // Animation loop
        const animate = () => {
          if (disposed) return
          animationId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Resize handler
        const handleResize = () => {
          if (!container || disposed) return
          camera.aspect = container.clientWidth / container.clientHeight
          camera.updateProjectionMatrix()
          renderer.setSize(container.clientWidth, container.clientHeight)
        }
        window.addEventListener('resize', handleResize)

        viewerRef.current = {
          scene,
          camera,
          renderer,
          controls,
          dispose: () => {
            window.removeEventListener('resize', handleResize)
            renderer.domElement.removeEventListener('click', onClick)
            controls.dispose()
            renderer.dispose()
            if (container.contains(renderer.domElement)) {
              container.removeChild(renderer.domElement)
            }
          }
        }

      } catch (err: any) {
        console.error('[IFCViewer] Error:', err)
        setError(`Failed to load IFC: ${err.message}`)
        setLoading(false)
      }
    }

    initViewer()

    return () => {
      disposed = true
      if (animationId) cancelAnimationFrame(animationId)
      if (viewerRef.current?.dispose) {
        viewerRef.current.dispose()
      }
    }
  }, [fileUrl]) // Only reload when fileUrl changes, not on callback changes

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
      {/* Header like Speckle */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className="text-white text-sm font-medium">IFC 3D Viewer</span>
        </div>
        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
          Ready
        </span>
      </div>
      
      <div 
        ref={containerRef} 
        className="h-[calc(100%-40px)] w-full relative"
        style={{ minHeight: '450px' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d] z-10">
            <div className="text-center bg-gray-800/90 p-6 rounded-xl border border-gray-700">
              <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-white font-medium">Loading IFC Model</p>
              <p className="text-gray-400 text-sm mt-1">{model?.name}</p>
              <div className="w-48 bg-gray-700 rounded-full h-2 mt-4 mx-auto overflow-hidden">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-500 text-xs mt-2">{progress}%</p>
            </div>
          </div>
        )}
        
        {selectedElement && selectedElementInfo && (
          <div className="absolute top-3 left-3 bg-gray-800/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm z-10 border border-gray-600">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                {selectedElementInfo.type}
              </span>
              <span className="text-gray-400">#{selectedElementInfo.id}</span>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-3 left-3 bg-gray-800/80 backdrop-blur-sm text-gray-300 px-3 py-2 rounded-lg text-xs z-10 border border-gray-700">
          🖱️ Click to select • Scroll to zoom • Drag to rotate
        </div>
      </div>
    </div>
  )
})

IFCViewer.displayName = 'IFCViewer'

export default IFCViewer