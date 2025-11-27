'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

interface IFCViewerFixedProps {
  model: any
  onElementSelect?: (elementId: string, element: any) => void
}

export default function IFCViewerFixed({ model, onElementSelect }: IFCViewerFixedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const sceneRef = useRef<any>(null)
  const rendererRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const fileUrl = model?.filePath || model?.fileUrl || model?.sourceUrl
    
    if (!fileUrl) {
      setError('No IFC file URL provided')
      setLoading(false)
      return
    }

    if (!containerRef.current) return

    let animationId: number
    let disposed = false

    const initViewer = async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

        // Create scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf0f0f0)
        sceneRef.current = scene

        // Create camera
        const camera = new THREE.PerspectiveCamera(
          75,
          containerRef.current!.clientWidth / containerRef.current!.clientHeight,
          0.1,
          2000
        )
        camera.position.set(50, 50, 50)
        cameraRef.current = camera

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight)
        renderer.setPixelRatio(window.devicePixelRatio)
        containerRef.current!.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Add controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controlsRef.current = controls

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(50, 100, 50)
        scene.add(directionalLight)

        // Add grid
        const gridHelper = new THREE.GridHelper(200, 50, 0x888888, 0xcccccc)
        scene.add(gridHelper)

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(20)
        scene.add(axesHelper)

        setProgress(50)

        // Note: Full IFC loading requires web-ifc-three package
        // For now, display a placeholder with the grid
        console.log('[IFCViewerFixed] IFC file URL:', fileUrl)
        console.log('[IFCViewerFixed] Note: Full IFC loading requires web-ifc-three package installation')
        
        setProgress(100)
        setLoading(false)

        // Animation loop
        const animate = () => {
          if (disposed) return
          animationId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current || disposed) return
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
          camera.updateProjectionMatrix()
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
        }
        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
        }
      } catch (err: any) {
        console.error('[IFCViewerFixed] Error:', err)
        setError(`Failed to initialize: ${err.message}`)
        setLoading(false)
      }
    }

    initViewer()

    return () => {
      disposed = true
      if (animationId) cancelAnimationFrame(animationId)
      if (rendererRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement)
        } catch (e) {
          // Ignore
        }
      }
      if (rendererRef.current) rendererRef.current.dispose()
      if (controlsRef.current) controlsRef.current.dispose()
    }
  }, [model])

  return (
    <div ref={containerRef} className="h-full w-full bg-gray-900 relative" style={{ minHeight: '600px' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center max-w-md">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Loading IFC Model</h3>
            <p className="text-gray-400 mb-4">{model?.name}</p>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{Math.round(progress)}%</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <Alert className="max-w-md bg-gray-800 border-red-500">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-gray-200">
              <strong>Error Loading IFC Model</strong>
              <p className="mt-2">{error}</p>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
