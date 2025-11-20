/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ThreeViewerProps {
  model?: any
}

export default function ThreeViewer({ model }: ThreeViewerProps) {
   const mountRef = useRef<HTMLDivElement>(null)
   const sceneRef = useRef<THREE.Scene | null>(null)
   const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
   const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(10, 10, 10)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20)
    scene.add(gridHelper)

    // Sample geometry (placeholder for actual model)
    if (!model) {
      // Create a simple building-like structure
      const buildingGroup = new THREE.Group()

      // Foundation
      const foundationGeometry = new THREE.BoxGeometry(8, 0.5, 6)
      const foundationMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 })
      const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial)
      foundation.position.y = 0.25
      foundation.castShadow = true
      foundation.receiveShadow = true
      buildingGroup.add(foundation)

      // Walls
      const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc })
      
      // Front wall
      const frontWallGeometry = new THREE.BoxGeometry(8, 3, 0.2)
      const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial)
      frontWall.position.set(0, 2, 3)
      frontWall.castShadow = true
      buildingGroup.add(frontWall)

      // Back wall
      const backWall = new THREE.Mesh(frontWallGeometry, wallMaterial)
      backWall.position.set(0, 2, -3)
      backWall.castShadow = true
      buildingGroup.add(backWall)

      // Side walls
      const sideWallGeometry = new THREE.BoxGeometry(0.2, 3, 6)
      const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
      leftWall.position.set(-4, 2, 0)
      leftWall.castShadow = true
      buildingGroup.add(leftWall)

      const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
      rightWall.position.set(4, 2, 0)
      rightWall.castShadow = true
      buildingGroup.add(rightWall)

      // Roof
      const roofGeometry = new THREE.BoxGeometry(8.5, 0.3, 6.5)
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
      const roof = new THREE.Mesh(roofGeometry, roofMaterial)
      roof.position.y = 3.65
      roof.castShadow = true
      buildingGroup.add(roof)

      scene.add(buildingGroup)
    }

    // Controls (basic mouse interaction)
    let mouseX = 0
    let mouseY = 0
    let isMouseDown = false

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true
      mouseX = event.clientX
      mouseY = event.clientY
    }

    const handleMouseUp = () => {
      isMouseDown = false
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return

      const deltaX = event.clientX - mouseX
      const deltaY = event.clientY - mouseY

      camera.position.x = camera.position.x * Math.cos(deltaX * 0.01) + camera.position.z * Math.sin(deltaX * 0.01)
      camera.position.z = camera.position.z * Math.cos(deltaX * 0.01) - camera.position.x * Math.sin(deltaX * 0.01)
      
      camera.lookAt(0, 0, 0)

      mouseX = event.clientX
      mouseY = event.clientY
    }

    mountRef.current.appendChild(renderer.domElement)
    mountRef.current.addEventListener('mousedown', handleMouseDown)
    mountRef.current.addEventListener('mouseup', handleMouseUp)
    mountRef.current.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousedown', handleMouseDown)
        mountRef.current.removeEventListener('mouseup', handleMouseUp)
        mountRef.current.removeEventListener('mousemove', handleMouseMove)
        if (mountRef.current.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement)
        }
      }
      renderer.dispose()
    }
  }, [model])

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full viewer-container"
      style={{ minHeight: '400px' }}
    />
  )
}