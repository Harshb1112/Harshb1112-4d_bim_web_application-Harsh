/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export interface SimulationViewerRef {
  isolateObjects: (guids: string[], ghost?: boolean) => void
  hideObjects: (guids: string[]) => void
  showObjects: (guids: string[]) => void
  setColorFilter: (filter: {
    property: string
    multiple?: Array<{ property: { key: string; value: string }; color: string; opacity?: number }>
    default_color?: string
  }) => void
  getCanvas: () => HTMLCanvasElement | null
}

interface SimulationIFCViewerProps {
  model: any
  onElementSelect?: (elementId: string, element: any) => void
  viewerCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>
}

const SimulationIFCViewer = forwardRef<SimulationViewerRef, SimulationIFCViewerProps>(
  ({ model, onElementSelect, viewerCanvasRef }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const meshMapRef = useRef<Map<string, any>>(new Map())
    const originalMaterialsRef = useRef<Map<string, any>>(new Map())
    const onElementSelectRef = useRef(onElementSelect)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const [selectedElement, setSelectedElement] = useState<string | null>(null)
    const [selectedElementInfo, setSelectedElementInfo] = useState<{ type: string; id: number } | null>(null)

    useEffect(() => {
      onElementSelectRef.current = onElementSelect
    }, [onElementSelect])

    // Construct proper file URL for IFC files
    const fileUrl = model?.fileUrl || 
                    (model?.filePath && model?.id ? `/api/models/${model.id}/file` : null) || 
                    model?.sourceUrl

    // Expose imperative methods for simulation control
    useImperativeHandle(ref, () => ({
      isolateObjects: (guids: string[], ghost = true) => {
        meshMapRef.current.forEach((mesh, guid) => {
          if (guids.includes(guid)) {
            mesh.visible = true
            if (mesh.material) {
              mesh.material.transparent = false
              mesh.material.opacity = 1
            }
          } else if (ghost) {
            mesh.visible = true
            if (mesh.material) {
              mesh.material.transparent = true
              mesh.material.opacity = 0.1
            }
          } else {
            mesh.visible = false
          }
        })
      },

      hideObjects: (guids: string[]) => {
        if (guids.length === 0) {
          // Hide all elements
          meshMapRef.current.forEach((mesh) => {
            mesh.visible = false
          })
        } else {
          // Hide specific elements
          guids.forEach(guid => {
            const mesh = meshMapRef.current.get(guid)
            if (mesh) {
              mesh.visible = false
            }
          })
        }
      },

      showObjects: (guids: string[]) => {
        guids.forEach(guid => {
          const mesh = meshMapRef.current.get(guid)
          if (mesh) {
            mesh.visible = true
            if (mesh.material) {
              mesh.material.transparent = false
              mesh.material.opacity = 1
            }
          }
        })
      },

      setColorFilter: (filter) => {
        if (!filter.multiple) return
        
        console.log(`🎨 [IFC Viewer] Applying colors to ${filter.multiple.length} elements`)
        
        // Import THREE dynamically for color conversion
        import('three').then(THREE => {
          let appliedCount = 0
          filter.multiple?.forEach(({ property, color, opacity }) => {
            const guid = property.value
            const mesh = meshMapRef.current.get(guid)
            if (mesh && mesh.material) {
              // Store original material if not stored
              if (!originalMaterialsRef.current.has(guid)) {
                originalMaterialsRef.current.set(guid, mesh.material.clone())
              }
              
              // Create new material with color to ensure it's applied
              const newMaterial = mesh.material.clone()
              newMaterial.color = new THREE.Color(color)
              
              // Apply opacity if specified
              if (opacity !== undefined) {
                newMaterial.transparent = opacity < 1
                newMaterial.opacity = opacity
              } else {
                newMaterial.transparent = false
                newMaterial.opacity = 1
              }
              
              // Apply the new material
              mesh.material = newMaterial
              appliedCount++
            }
          })
          console.log(`🎨 [IFC Viewer] Successfully applied colors to ${appliedCount} elements`)
        })
      },

      getCanvas: () => rendererRef.current?.domElement || null
    }))


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

          // Scene setup - White background like Autodesk
          const scene = new THREE.Scene()
          scene.background = new THREE.Color(0xffffff)  // White background
          sceneRef.current = scene
          
          // Store scene globally for element extraction
          (window as any).ifcScene = scene

          // Camera
          const camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            10000
          )
          camera.position.set(50, 50, 50)

          // Renderer with WebGL context recovery
          const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            preserveDrawingBuffer: true, // Important for video recording
            powerPreference: 'high-performance', // Use dedicated GPU
            failIfMajorPerformanceCaveat: false // Don't fail on slow hardware
          })
          renderer.setSize(container.clientWidth, container.clientHeight)
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Limit to 2x for performance
          renderer.shadowMap.enabled = true
          container.appendChild(renderer.domElement)
          rendererRef.current = renderer

          // WebGL Context Lost/Restored handlers
          const canvas = renderer.domElement
          canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            console.error('⚠️ WebGL context lost! Attempting recovery...')
            setError('WebGL context lost. Attempting to recover...')
            // Stop animation loop
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId)
            }
          }, false)

          canvas.addEventListener('webglcontextrestored', () => {
            console.log('✅ WebGL context restored!')
            setError(null)
            // Restart animation loop
            animate()
          }, false)

          // Set canvas ref for video recording
          if (viewerCanvasRef) {
            viewerCanvasRef.current = renderer.domElement
          }

          // Controls
          const controls = new OrbitControls(camera, renderer.domElement)
          controls.enableDamping = true
          controls.dampingFactor = 0.05
          controls.minDistance = 1
          controls.maxDistance = 5000
          controls.enableZoom = true
          controls.zoomSpeed = 1.5
          controls.enablePan = true
          controls.panSpeed = 1.0

          // Lights
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
          scene.add(ambientLight)

          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
          directionalLight.position.set(100, 100, 50)
          directionalLight.castShadow = true
          scene.add(directionalLight)

          // Grid - light style like Autodesk
          const gridHelper = new THREE.GridHelper(200, 40, 0xcccccc, 0xe8e8e8)
          gridHelper.name = 'grid'
          scene.add(gridHelper)

          setProgress(40)

          // Raycaster for selection
          const raycaster = new THREE.Raycaster()
          const mouse = new THREE.Vector2()
          let selectedObject: any = null

          // Load IFC file
          console.log('[SimulationIFCViewer] Loading IFC file:', fileUrl)
          
          try {
            const response = await fetch(fileUrl, {
              credentials: 'include', // Include cookies for authentication
            })
            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unknown error')
              throw new Error(`Failed to fetch IFC file (${response.status}): ${errorText}`)
            }
            
            setProgress(60)
            const arrayBuffer = await response.arrayBuffer()
            
            setProgress(70)
            
            const WebIFC = await import('web-ifc')
            const ifcApi = new WebIFC.IfcAPI()
            
            ifcApi.SetWasmPath('/wasm/', true)
            await ifcApi.Init((path: string) => `/wasm/${path}`)
            
            setProgress(80)
            
            const modelID = ifcApi.OpenModel(new Uint8Array(arrayBuffer))
            
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
                      const vertexCount = vertexData.length / 6
                      const positions = new Float32Array(vertexCount * 3)
                      const normals = new Float32Array(vertexCount * 3)
                      
                      for (let v = 0; v < vertexCount; v++) {
                        positions[v * 3] = vertexData[v * 6]
                        positions[v * 3 + 1] = vertexData[v * 6 + 1]
                        positions[v * 3 + 2] = vertexData[v * 6 + 2]
                        normals[v * 3] = vertexData[v * 6 + 3]
                        normals[v * 3 + 1] = vertexData[v * 6 + 4]
                        normals[v * 3 + 2] = vertexData[v * 6 + 5]
                      }
                      
                      const bufferGeometry = new THREE.BufferGeometry()
                      bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
                      bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
                      bufferGeometry.setIndex(Array.from(indices))
                      
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
                      
                      const matrix = new THREE.Matrix4()
                      matrix.fromArray(placedGeometry.flatTransformation)
                      mesh.applyMatrix4(matrix)
                      
                      const elementGuid = `IFC_${expressID}`
                      mesh.userData = { expressID, ifcType, guid: elementGuid }
                      mesh.name = elementGuid
                      
                      // Store mesh reference for simulation control
                      meshMapRef.current.set(elementGuid, mesh)
                      
                      elementsGroup.add(mesh)
                    }
                  } catch (e) { /* skip */ }
                }
              } catch (e) { /* skip */ }
            }
            
            scene.add(elementsGroup)
            
            // Center camera and grid on model
            const box = new THREE.Box3().setFromObject(elementsGroup)
            if (!box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              
              // Calculate optimal camera distance for better view
              const fov = camera.fov * (Math.PI / 180)
              const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.7
              
              // Position camera at optimal distance
              const cameraOffset = new THREE.Vector3(
                cameraDistance * 0.7,
                cameraDistance * 0.5,
                cameraDistance * 0.7
              )
              
              camera.position.copy(center).add(cameraOffset)
              camera.lookAt(center)
              
              // Set controls target to model center
              controls.target.copy(center)
              controls.update()
              
              // Adjust camera near/far planes based on model size
              camera.near = maxDim / 100
              camera.far = maxDim * 100
              camera.updateProjectionMatrix()
              
              // Reposition grid to model center - light style
              const gridSize = Math.max(maxDim * 2, 100)
              scene.remove(gridHelper)
              const newGrid = new THREE.GridHelper(gridSize, 40, 0xcccccc, 0xe8e8e8)
              newGrid.position.set(center.x, box.min.y - 0.1, center.z)
              newGrid.name = 'grid'
              scene.add(newGrid)
              
              console.log('[SimulationIFCViewer] Model bounds:', {
                center: center.toArray(),
                size: size.toArray(),
                maxDim,
                cameraDistance,
                cameraPosition: camera.position.toArray()
              })
            }
            
            ifcApi.CloseModel(modelID)
            
            setProgress(100)
            setLoading(false)
            console.log('[SimulationIFCViewer] Loaded', meshMapRef.current.size, 'elements')
            
          } catch (ifcError: any) {
            console.warn('[SimulationIFCViewer] IFC loading failed:', ifcError.message)
            setError(`IFC loading failed: ${ifcError.message}`)
            setLoading(false)
          }

          // Click handler
          const onClick = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            raycaster.setFromCamera(mouse, camera)
            const intersects = raycaster.intersectObjects(scene.children, true)

            // Reset previous selection
            if (selectedObject && originalMaterialsRef.current.has(selectedObject.userData.guid)) {
              const originalMat = originalMaterialsRef.current.get(selectedObject.userData.guid)
              selectedObject.material = originalMat
            }

            // Find clicked element
            for (const intersect of intersects) {
              if (intersect.object instanceof THREE.Mesh && intersect.object.userData.expressID) {
                selectedObject = intersect.object
                
                // Store original material if not already stored
                if (!originalMaterialsRef.current.has(selectedObject.userData.guid)) {
                  originalMaterialsRef.current.set(selectedObject.userData.guid, selectedObject.material.clone())
                }
                
                // Highlight selected element
                selectedObject.material = new THREE.MeshPhongMaterial({
                  color: 0x00ff00,
                  emissive: 0x00aa00,
                  side: THREE.DoubleSide,
                  transparent: false,
                  opacity: 1
                })
                
                const elementId = selectedObject.userData.guid
                setSelectedElement(elementId)
                setSelectedElementInfo({
                  type: selectedObject.userData.typeName || 'Element',
                  id: selectedObject.userData.expressID
                })
                
                console.log('[SimulationIFCViewer] Selected element:', {
                  guid: elementId,
                  expressID: selectedObject.userData.expressID,
                  type: selectedObject.userData.typeName
                })
                
                if (onElementSelectRef.current) {
                  onElementSelectRef.current(elementId, {
                    id: elementId,
                    expressID: selectedObject.userData.expressID,
                    type: selectedObject.userData.typeName,
                    name: selectedObject.name,
                    userData: selectedObject.userData
                  })
                }
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

          return () => {
            window.removeEventListener('resize', handleResize)
            renderer.domElement.removeEventListener('click', onClick)
            controls.dispose()
            renderer.dispose()
            if (container.contains(renderer.domElement)) {
              container.removeChild(renderer.domElement)
            }
          }

        } catch (err: any) {
          console.error('[SimulationIFCViewer] Error:', err)
          setError(`Failed to load IFC: ${err.message}`)
          setLoading(false)
        }
      }

      initViewer()

      return () => {
        disposed = true
        if (animationId) cancelAnimationFrame(animationId)
      }
    }, [fileUrl])

    if (error) {
      return (
        <div className="flex items-center justify-center h-full bg-white rounded-lg border border-gray-300">
          <Alert className="max-w-md bg-white border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-gray-700">{error}</AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className="h-full w-full rounded-lg border border-gray-300 overflow-hidden bg-white">
        <div ref={containerRef} className="h-full w-full relative" style={{ minHeight: '450px' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center bg-white p-6 rounded-xl border border-gray-300 shadow-lg">
                <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-3" />
                <p className="text-gray-900 font-medium">Loading IFC Model</p>
                <div className="w-48 bg-gray-200 rounded-full h-2 mt-4 mx-auto overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-gray-600 text-xs mt-2">{progress}%</p>
              </div>
            </div>
          )}
          
          {selectedElement && selectedElementInfo && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-lg text-sm z-10 border border-gray-300 shadow-md">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 rounded text-xs font-medium">
                  {selectedElementInfo.type}
                </span>
                <span className="text-gray-600">#{selectedElementInfo.id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

SimulationIFCViewer.displayName = 'SimulationIFCViewer'

export default SimulationIFCViewer
