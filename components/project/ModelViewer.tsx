'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw,
  Layers
} from 'lucide-react';

interface ModelViewerProps {
  project: any;
  selectedTask: any;
}

export default function ModelViewer({ project, selectedTask }: ModelViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState<string[]>([]);

  useEffect(() => {
    if (project?.bimSource === 'SPECKLE' && project?.bimUrl) {
      loadSpeckleModel();
    } else if (project?.bimSource === 'IFC_LOCAL') {
      loadIFCModel();
    } else {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (selectedTask && viewer) {
      highlightTaskElements(selectedTask);
    }
  }, [selectedTask, viewer]);

  const loadSpeckleModel = async () => {
    try {
      // Load Speckle Viewer
      const { Viewer } = await import('@speckle/viewer');
      
      const speckleViewer = new Viewer(viewerRef.current!);

      await speckleViewer.init();
      await speckleViewer.loadObject(project.bimUrl);

      setViewer(speckleViewer);
      setLoading(false);
    } catch (error) {
      console.error('Error loading Speckle model:', error);
      setLoading(false);
    }
  };

  const loadIFCModel = async () => {
    try {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

      // Setup Three.js scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);

      const camera = new THREE.PerspectiveCamera(
        75,
        viewerRef.current!.clientWidth / viewerRef.current!.clientHeight,
        0.1,
        1000
      );
      camera.position.set(10, 10, 10);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(viewerRef.current!.clientWidth, viewerRef.current!.clientHeight);
      viewerRef.current!.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);

      // Add placeholder grid for IFC models (IFC loading requires additional setup)
      const gridHelper = new THREE.GridHelper(20, 20);
      scene.add(gridHelper);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      setViewer({ scene, camera, renderer, controls });
      setLoading(false);
      
      console.log('IFC viewer initialized. Note: Full IFC loading requires web-ifc-three package.');
    } catch (error) {
      console.error('Error loading IFC model:', error);
      setLoading(false);
    }
  };

  const highlightTaskElements = async (task: any) => {
    if (!task.elements || task.elements.length === 0) return;

    // Get element IDs linked to this task
    const elementIds = task.elements.map((e: any) => e.elementId);
    setHighlightedElements(elementIds);

    // Highlight in viewer based on task status
    const color = getTaskColor(task.status);
    
    if (viewer && viewer.setColor) {
      elementIds.forEach((id: string) => {
        viewer.setColor(id, color);
      });
    }
  };

  const getTaskColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return { r: 0, g: 255, b: 0 }; // Green
      case 'IN_PROGRESS':
        return { r: 255, g: 255, b: 0 }; // Yellow
      case 'ON_HOLD':
        return { r: 255, g: 165, b: 0 }; // Orange
      default:
        return { r: 200, g: 200, b: 200 }; // Gray
    }
  };

  const handleZoomIn = () => {
    if (viewer?.camera) {
      viewer.camera.position.multiplyScalar(0.8);
    }
  };

  const handleZoomOut = () => {
    if (viewer?.camera) {
      viewer.camera.position.multiplyScalar(1.2);
    }
  };

  const handleResetView = () => {
    if (viewer?.controls) {
      viewer.controls.reset();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading 3D model...</p>
        </div>
      </div>
    );
  }

  if (!project?.bimUrl && !project?.models?.[0]) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No 3D model uploaded</p>
          <Button className="mt-4">Upload Model</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* 3D Viewer Container */}
      <div ref={viewerRef} className="w-full h-full" />

      {/* Viewer Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleResetView}
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          title="Fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Task Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-xs">Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-xs">On Hold</span>
          </div>
        </div>
      </div>

      {/* Selected Task Info */}
      {selectedTask && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-semibold text-sm mb-1">{selectedTask.name}</h3>
          <p className="text-xs text-gray-600 mb-2">
            Progress: {selectedTask.progress}%
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${selectedTask.progress}%` }}
            />
          </div>
          {highlightedElements.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {highlightedElements.length} elements highlighted
            </p>
          )}
        </div>
      )}
    </div>
  );
}
