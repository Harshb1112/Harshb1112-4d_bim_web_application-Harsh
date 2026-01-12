/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export interface IFCViewerRef {
  isolateObjects: (guids: string[], ghost?: boolean) => void
  unIsolateObjects: () => void
  selectObjects: (guids: string[]) => void
  fitToView: (guids?: string[]) => void
  hideObjects: (guids: string[]) => void
  showAllObjects: () => void
  applyFilter: (property: string, value: any) => void
  clearFilter: () => void
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
    isolateObjects: (guids: string[], ghost = false) => {
      // IFC viewer isolation - hide non-selected elements
      if (viewerRef.current && guids.length > 0) {
        try {
          const scene = viewerRef.current.scene
          if (!scene) return
          
          const selectedIds = guids.map(g => g.replace('IFC_', '')).map(id => parseInt(id)).filter(id => !isNaN(id))
          
          scene.traverse((obj: any) => {
            if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
              const expressID = obj.userData?.expressID
              if (expressID) {
                const isSelected = selectedIds.includes(expressID)
                if (ghost) {
                  // Ghost mode: make non-selected transparent
                  obj.visible = true
                  if (obj.material) {
                    obj.material.transparent = true
                    obj.material.opacity = isSelected ? 1.0 : 0.2
                  }
                } else {
                  // Hide mode: hide non-selected
                  obj.visible = isSelected
                }
              }
            }
          })
        } catch (e) {
          console.warn('IFC isolation error:', e)
        }
      }
    },
    unIsolateObjects: () => {
      if (viewerRef.current) {
        try {
          const scene = viewerRef.current.scene
          if (!scene) return
          
          scene.traverse((obj: any) => {
            if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
              obj.visible = true
              if (obj.material) {
                obj.material.transparent = true
                obj.material.opacity = 0.9
              }
            }
          })
        } catch (e) {
          console.warn('IFC un-isolation error:', e)
        }
      }
    },
    selectObjects: (guids: string[]) => {
      if (viewerRef.current && guids.length > 0) {
        try {
          const scene = viewerRef.current.scene
          if (!scene) return
          
          const selectedIds = guids.map(g => g.replace('IFC_', '')).map(id => parseInt(id)).filter(id => !isNaN(id))
          
          scene.traverse((obj: any) => {
            if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
              const expressID = obj.userData?.expressID
              if (expressID && selectedIds.includes(expressID)) {
                // Highlight selected
                if (obj.material) {
                  obj.material = obj.material.clone()
                  obj.material.color.setHex(0x00ff00)
                  obj.material.emissive.setHex(0x003300)
                }
              }
            }
          })
        } catch (e) {
          console.warn('IFC selection error:', e)
        }
      }
    },
    fitToView: (guids?: string[]) => {
      if (viewerRef.current) {
        try {
          const { scene, camera, controls } = viewerRef.current
          if (!scene || !camera || !controls) return
          
          const THREE = (window as any).THREE
          if (!THREE) return
          
          if (guids && guids.length > 0) {
            // Fit to selected objects
            const selectedIds = guids.map(g => g.replace('IFC_', '')).map(id => parseInt(id)).filter(id => !isNaN(id))
            const group = new THREE.Group()
            
            scene.traverse((obj: any) => {
              if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
                const expressID = obj.userData?.expressID
                if (expressID && selectedIds.includes(expressID)) {
                  group.add(obj.clone())
                }
              }
            })
            
            if (group.children.length > 0) {
              const box = new THREE.Box3().setFromObject(group)
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              
              camera.position.set(center.x + maxDim, center.y + maxDim, center.z + maxDim)
              camera.lookAt(center)
              controls.target.copy(center)
              controls.update()
            }
          } else {
            // Fit to all
            const box = new THREE.Box3().setFromObject(scene)
            if (!box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              
              camera.position.set(center.x + maxDim, center.y + maxDim, center.z + maxDim)
              camera.lookAt(center)
              controls.target.copy(center)
              controls.update()
            }
          }
        } catch (e) {
          console.warn('IFC fit to view error:', e)
        }
      }
    },
    hideObjects: (guids: string[]) => {
      if (viewerRef.current && guids.length > 0) {
        try {
          const scene = viewerRef.current.scene
          if (!scene) return
          
          const hideIds = guids.map(g => g.replace('IFC_', '')).map(id => parseInt(id)).filter(id => !isNaN(id))
          
          scene.traverse((obj: any) => {
            if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
              const expressID = obj.userData?.expressID
              if (expressID && hideIds.includes(expressID)) {
                obj.visible = false
              }
            }
          })
        } catch (e) {
          console.warn('IFC hide error:', e)
        }
      }
    },
    showAllObjects: () => {
      if (viewerRef.current) {
        try {
          const scene = viewerRef.current.scene
          if (!scene) return
          
          scene.traverse((obj: any) => {
            if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
              obj.visible = true
            }
          })
        } catch (e) {
          console.warn('IFC show all error:', e)
        }
      }
    },
    applyFilter: (property: string, value: any) => {
      if (viewerRef.current) {
        try {
          const scene = viewerRef.current.scene
          if (!scene) return
          
          scene.traverse((obj: any) => {
            if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
              const userData = obj.userData
              if (userData && userData[property] !== undefined) {
                obj.visible = userData[property] === value || String(userData[property]) === String(value)
              } else {
                obj.visible = false
              }
            }
          })
        } catch (e) {
          console.warn('IFC filter error:', e)
        }
      }
    },
    clearFilter: () => {
      if (viewerRef.current) {
        try {
          const scene = viewerRef.current.scene
          if (!scene) return
          
          scene.traverse((obj: any) => {
            if (obj.isMesh && obj.name && obj.name.startsWith('IFC_')) {
              obj.visible = true
            }
          })
        } catch (e) {
          console.warn('IFC clear filter error:', e)
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
        
        // Scene setup - White background like Autodesk
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xffffff) // White background

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
        controls.minDistance = 1
        controls.maxDistance = 5000
        controls.enableZoom = true
        controls.zoomSpeed = 1.5
        controls.enablePan = true
        controls.panSpeed = 1.0

        // Lights - adjusted for white background
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(100, 100, 50)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
        directionalLight2.position.set(-50, 50, -50)
        scene.add(directionalLight2)

        // Grid - light style like Autodesk, will be repositioned after model loads
        const gridHelper = new THREE.GridHelper(200, 40, 0xcccccc, 0xe8e8e8)
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
            
            // Reposition grid to model center (at bottom of model) - light style
            const gridSize = Math.max(maxDim * 2, 100)
            scene.remove(gridHelper)
            const newGrid = new THREE.GridHelper(gridSize, 40, 0xcccccc, 0xe8e8e8)
            newGrid.position.set(center.x, box.min.y - 0.1, center.z)
            newGrid.name = 'grid'
            scene.add(newGrid)
            
            // Reposition axes to model center
            axesHelper.position.set(center.x - gridSize/2, box.min.y, center.z - gridSize/2)
            
            console.log('[IFCViewer] Camera positioned:', {
              cameraDistance: cameraDistance.toFixed(2),
              cameraPosition: camera.position.toArray().map(v => v.toFixed(2)),
              controlsTarget: controls.target.toArray().map(v => v.toFixed(2))
            })
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

        // Click handler for selection with multi-select support
        const selectedObjects = new Set<any>()
        
        // Box selection variables
        let isBoxSelecting = false
        let boxStartX = 0
        let boxStartY = 0
        let selectionBox: HTMLDivElement | null = null
        
        const createSelectionBox = () => {
          const box = document.createElement('div')
          box.style.position = 'absolute'
          box.style.border = '2px solid #0066ff'
          box.style.backgroundColor = 'rgba(0, 102, 255, 0.1)'
          box.style.pointerEvents = 'none'
          box.style.zIndex = '1000'
          container.appendChild(box)
          return box
        }
        
        const onMouseDown = (event: MouseEvent) => {
          // Only start box selection with Shift key
          if (event.shiftKey && event.button === 0) {
            isBoxSelecting = true
            const rect = renderer.domElement.getBoundingClientRect()
            boxStartX = event.clientX - rect.left
            boxStartY = event.clientY - rect.top
            
            selectionBox = createSelectionBox()
            selectionBox.style.left = boxStartX + 'px'
            selectionBox.style.top = boxStartY + 'px'
            selectionBox.style.width = '0px'
            selectionBox.style.height = '0px'
            
            event.preventDefault()
          }
        }
        
        const onMouseMove = (event: MouseEvent) => {
          if (isBoxSelecting && selectionBox) {
            const rect = renderer.domElement.getBoundingClientRect()
            const currentX = event.clientX - rect.left
            const currentY = event.clientY - rect.top
            
            const width = Math.abs(currentX - boxStartX)
            const height = Math.abs(currentY - boxStartY)
            const left = Math.min(currentX, boxStartX)
            const top = Math.min(currentY, boxStartY)
            
            selectionBox.style.left = left + 'px'
            selectionBox.style.top = top + 'px'
            selectionBox.style.width = width + 'px'
            selectionBox.style.height = height + 'px'
          }
        }
        
        const onMouseUp = (event: MouseEvent) => {
          if (isBoxSelecting && selectionBox) {
            const rect = renderer.domElement.getBoundingClientRect()
            const endX = event.clientX - rect.left
            const endY = event.clientY - rect.top
            
            // Calculate normalized device coordinates for box corners
            const x1 = (Math.min(boxStartX, endX) / rect.width) * 2 - 1
            const y1 = -(Math.max(boxStartY, endY) / rect.height) * 2 + 1
            const x2 = (Math.max(boxStartX, endX) / rect.width) * 2 - 1
            const y2 = -(Math.min(boxStartY, endY) / rect.height) * 2 + 1
            
            // Clear previous selection if not holding Ctrl
            if (!event.ctrlKey && !event.metaKey) {
              selectedObjects.forEach(obj => {
                const originalMat = originalMaterials.get(obj.uuid)
                if (originalMat) {
                  obj.material = originalMat
                }
              })
              selectedObjects.clear()
            }
            
            // Find all objects within the box
            scene.traverse((obj: any) => {
              if (obj.isMesh && obj.name && obj.name.startsWith('IFC_') && obj.userData.expressID) {
                // Project object position to screen space
                const pos = obj.position.clone()
                pos.project(camera)
                
                // Check if within selection box
                if (pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2) {
                  if (!originalMaterials.has(obj.uuid)) {
                    originalMaterials.set(obj.uuid, obj.material)
                  }
                  
                  // Highlight
                  obj.material = new THREE.MeshPhongMaterial({
                    color: 0x00ff00,
                    emissive: 0x003300,
                    side: THREE.DoubleSide
                  })
                  
                  selectedObjects.add(obj)
                }
              }
            })
            
            // Update callback with all selected
            if (selectedObjects.size > 0 && onElementSelectRef.current) {
              const selectedIds = Array.from(selectedObjects).map((obj: any) => `IFC_${obj.userData.expressID}`)
              const firstObj: any = Array.from(selectedObjects)[0]
              onElementSelectRef.current(`IFC_${firstObj.userData.expressID}`, {
                id: `IFC_${firstObj.userData.expressID}`,
                expressID: firstObj.userData.expressID,
                type: firstObj.userData.typeName,
                name: firstObj.name,
                userData: firstObj.userData,
                allSelected: selectedIds
              })
            }
            
            console.log('[IFCViewer] Box selected:', selectedObjects.size, 'objects')
            
            // Remove selection box
            if (selectionBox && container.contains(selectionBox)) {
              container.removeChild(selectionBox)
            }
            selectionBox = null
            isBoxSelecting = false
          }
        }
        
        const onClick = (event: MouseEvent) => {
          // Skip if we just finished box selection
          if (isBoxSelecting) return
          
          const rect = renderer.domElement.getBoundingClientRect()
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

          raycaster.setFromCamera(mouse, camera)
          const intersects = raycaster.intersectObjects(scene.children, true)

          // Check for Ctrl/Cmd key for multi-select
          const isMultiSelect = event.ctrlKey || event.metaKey
          
          // If not multi-select, clear previous selections
          if (!isMultiSelect) {
            selectedObjects.forEach(obj => {
              const originalMat = originalMaterials.get(obj.uuid)
              if (originalMat) {
                obj.material = originalMat
              }
            })
            selectedObjects.clear()
          }

          // Find first mesh intersection
          let foundObject = null
          for (const intersect of intersects) {
            if (intersect.object instanceof THREE.Mesh && intersect.object.userData.expressID) {
              foundObject = intersect.object
              break
            }
          }

          if (foundObject) {
            // Toggle selection if Ctrl is pressed and object already selected
            if (isMultiSelect && selectedObjects.has(foundObject)) {
              // Deselect
              const originalMat = originalMaterials.get(foundObject.uuid)
              if (originalMat) {
                foundObject.material = originalMat
              }
              selectedObjects.delete(foundObject)
            } else {
              // Select
              if (!originalMaterials.has(foundObject.uuid)) {
                originalMaterials.set(foundObject.uuid, foundObject.material)
              }
              
              // Highlight
              foundObject.material = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                emissive: 0x003300,
                side: THREE.DoubleSide
              })
              
              selectedObjects.add(foundObject)
            }
            
            // Update selected element info
            const elementId = `IFC_${foundObject.userData.expressID}`
            setSelectedElement(elementId)
            setSelectedElementInfo({
              type: foundObject.userData.typeName || 'Element',
              id: foundObject.userData.expressID
            })
            
            // Call callback with all selected elements
            if (onElementSelectRef.current) {
              const selectedIds = Array.from(selectedObjects).map((obj: any) => `IFC_${obj.userData.expressID}`)
              onElementSelectRef.current(elementId, {
                id: elementId,
                expressID: foundObject.userData.expressID,
                type: foundObject.userData.typeName,
                name: foundObject.name,
                userData: foundObject.userData,
                allSelected: selectedIds
              })
            }
            
            console.log('[IFCViewer] Selected:', foundObject.userData, 'Total selected:', selectedObjects.size)
          } else if (!isMultiSelect) {
            // Clicked on empty space without Ctrl - clear selection
            setSelectedElement(null)
            setSelectedElementInfo(null)
          }
        }

        renderer.domElement.addEventListener('mousedown', onMouseDown)
        renderer.domElement.addEventListener('mousemove', onMouseMove)
        renderer.domElement.addEventListener('mouseup', onMouseUp)
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
            renderer.domElement.removeEventListener('mousedown', onMouseDown)
            renderer.domElement.removeEventListener('mousemove', onMouseMove)
            renderer.domElement.removeEventListener('mouseup', onMouseUp)
            renderer.domElement.removeEventListener('click', onClick)
            controls.dispose()
            renderer.dispose()
            if (container.contains(renderer.domElement)) {
              container.removeChild(renderer.domElement)
            }
            // Clean up selection box if exists
            if (selectionBox && container.contains(selectionBox)) {
              container.removeChild(selectionBox)
            }
          }
        };
        
        // Store scene globally for element extraction
        (window as any).ifcScene = scene

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