 /* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator' // Corrected import for Separator


import {
  Link2,
  RefreshCw,
  TreePine,
  Box,
  Layers,
  ChevronRight,
  ChevronDown} from 'lucide-react'
import { toast } from 'sonner'


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
  onElementSelect,
  selectedElements = [],
  onConnectionChange,
  sectionPlaneActive,
  measurementActive,
  filterProperties,
  isolateElements,
  hideElements
}, ref) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [streamId, setStreamId] = useState('')
  const [token, setToken] = useState('')
  const [serverUrl, setServerUrl] = useState('https://speckle.xyz')

  const [showProjectTree, setShowProjectTree] = useState(true)
  const [projectData, setProjectData] = useState<SpeckleObject | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

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
  if (!viewerContainerRef.current || viewerRef.current) return;

  const initViewer = async () => {
    try {
      const { Viewer } = await import('@speckle/viewer');

      const el = viewerContainerRef.current as HTMLElement;
      const viewer = new Viewer(el);
      await viewer.init();

      viewerRef.current = viewer;

      // 🔥 Universal, no-error selection listener
      (viewer as any).viewerEvents.on('object-selected', (ev: any) => {
        const hit = ev?.hits?.[0];
        if (hit && onElementSelect) {
          const obj = hit.object;
          onElementSelect(obj.userData.id || obj.id, obj.userData);
        }
      });

    } catch (err) {
      console.error(err);
      setError("Failed to initialize 3D viewer.");
    }
  };

  initViewer();

  return () => {
    viewerRef.current?.dispose();
    viewerRef.current = null;
  };
}, [onElementSelect]);


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
    if (!viewerRef.current || !streamId || !token) {
      setError('Please provide Stream ID and access token')
      return
    }
    setIsLoading(true)
    setError('')

    try {
      const commitsResponse = await fetch(`${serverUrl}/api/stream/${streamId}/commits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!commitsResponse.ok) throw new Error('Failed to fetch project commits')
      const commitsData = await commitsResponse.json()
      if (!commitsData.commits?.length) throw new Error('No commits found')
      const latestCommit = commitsData.commits[0]

      const ObjectLoader = (await import('@speckle/objectloader')).default

// 1. FIX: objectId required
const loader = new ObjectLoader({
  serverUrl,
  streamId,
  objectId: latestCommit.referencedObject,
  token,
})

// const objectUrl = `${serverUrl}/objects/${streamId}/${latestCommit.referencedObject}`

// 2. FIX: remove progress callback string error
// const raw = await loader.getAndConstructObject(objectUrl)

const raw = await loader.getAndConstructObject(() => {})


// 3. Normalize → always single object
const objectData = Array.isArray(raw) ? raw[0] : raw

// type check → fix Set<string> error
if (
  !objectData || typeof objectData.id !== "string" || !objectData.speckle_type
) {
  throw new Error("Invalid Speckle object: missing string id")
}

await viewerRef.current.unloadAll()

const resourceUrl = `${serverUrl}/streams/${streamId}/commits/${latestCommit.id}`
await viewerRef.current.loadObject(resourceUrl, token)

// No unused warning
setProjectData(objectData as SpeckleObject)
setIsConnected(true)

// FIX: Set<string>
setExpandedNodes(new Set<string>([objectData.id]))


    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect'
      setError(message)
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
                <Button onClick={connectToSpeckle} disabled={isLoading || !streamId || !token} size="sm" className="flex-1 text-xs">
                  {isLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
                  {isLoading ? 'Connecting...' : 'Connect'}
                </Button>
              ) : (
                <Button onClick={disconnectSpeckle} variant="outline" size="sm" className="flex-1 text-xs">Disconnect</Button>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="projectTree" className="text-xs">Project Tree</Label>
              <Switch id="projectTree" checked={showProjectTree} onCheckedChange={setShowProjectTree} disabled={!isConnected} />
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
            <div ref={viewerContainerRef} className="w-full h-full bg-gray-100 rounded-b-lg" style={{ minHeight: '500px' }} />
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 m-6 mt-0">
                <div className="text-center text-gray-500">
                  <Link2 className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Connect to Speckle</h3>
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