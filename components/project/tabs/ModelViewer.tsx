 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, Wifi, WifiOff, Scissors, Filter, X, EyeOff, Eye, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { SpeckleRealtimeClient } from '@/lib/speckle-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ElementPropertiesPanel from '../ElementPropertiesPanel'
import { Separator } from '@radix-ui/react-select'


import { Switch } from '@/components/ui/switch' 
import SpeckleViewer, { SpeckleViewerRef } from '../SpeckleViewer'


interface ModelViewerProps {
  project: any
  onElementSelect?: (elementId: string, element: any) => void
  selectedElements?: string[]
  onConnectionChange?: (connected: boolean, elements: any[]) => void
}

interface SpeckleCommit {
  id: string
  message?: string
  authorName?: string
}

export default function ModelViewer({
  project,
  onElementSelect,
  selectedElements,
  onConnectionChange
}: ModelViewerProps) {
  const viewerRef = useRef<SpeckleViewerRef>(null)
  const [syncing, setSyncing] = useState(false)

  const [speckleInfo, setSpeckleInfo] = useState({
    connected: false,
    serverUrl: '',
    token: '',
    streamId: '',
    commitId: ''
  })

  const [isLive, setIsLive] = useState(false)
  const realtimeClientRef = useRef<SpeckleRealtimeClient | null>(null)

  const [sectionPlaneActive, setSectionPlaneActive] = useState(false)
  const [measurementActive, setMeasurementActive] = useState(false)
  const [filterProperty, setFilterProperty] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [activeFilter, setActiveFilter] = useState<{ property: string; value: string | number | boolean } | null>(null)

  const [isolateMode, setIsolateMode] = useState(false)
  const [hideMode, setHideMode] = useState(false)

  const [selectedElementData, setSelectedElementData] = useState<any | null>(null)

  const [colorByProperty, setColorByProperty] = useState('')
  const [isColoringActive, setIsColoringActive] = useState(false)

  useEffect(() => {
    return () => {
      realtimeClientRef.current?.dispose()
    }
  }, [])

  const handleElementSelection = (elementId: string, element: any) => {
    setSelectedElementData(element)
    onElementSelect?.(elementId, element)
  }

  const handleConnectionState = (connected: boolean, elements: any[], info: any) => {
    onConnectionChange?.(connected, elements)

    setSpeckleInfo({
      connected,
      serverUrl: info?.serverUrl || '',
      token: info?.token || '',
      streamId: info?.streamId || '',
      commitId: info?.commitId || ''
    })

    if (connected && info.serverUrl && info.token && info.streamId) {
      setupRealtime(info.serverUrl, info.token, info.streamId)
    } else {
      realtimeClientRef.current?.dispose()
      realtimeClientRef.current = null
      setIsLive(false)
    }
  }

  const setupRealtime = (serverUrl: string, token: string, streamId: string) => {
    realtimeClientRef.current?.dispose()

    const client = new SpeckleRealtimeClient(serverUrl, token)

    client
      .subscribeToStream(streamId, (commit: unknown) => {

        if (commit && typeof commit === 'object' && 'id' in commit) {
          const c = commit as SpeckleCommit;
        toast.info('New commit detected', {
          description: c.message ?? 'New version available',
          action: {
            label: 'Load',
            onClick: () => viewerRef.current?.loadObject(c.id)
          }
        })

        viewerRef.current?.loadObject(c.id)
        } else {
    console.warn("Received unknown commit:", commit)
  }
      })
      .then(() => {
        setIsLive(true)
        toast.success('Live connection active')
      })
      .catch(() => {
        setIsLive(false)
        toast.error('Failed to activate live updates')
      })

    realtimeClientRef.current = client
  }

  const handleSyncElements = async () => {
    if (!speckleInfo.connected) {
      toast.warning('Connect first')
      return
    }

    setSyncing(true)

    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        const response = await fetch('/api/speckle/sync-elements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            modelId: project.models?.[0]?.id,
            serverUrl: speckleInfo.serverUrl,
            speckleToken: speckleInfo.token,
            streamId: speckleInfo.streamId,
            commitId: speckleInfo.commitId
          })
        })

        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Sync failed')

        resolve(result.message ?? 'Sync complete')
      } catch (err) {
        reject(err)
      } finally {
        setSyncing(false)
      }
    })

    toast.promise(promise, {
      loading: 'Syncing...',
      success: (msg) => msg,
      error: (err) => (err instanceof Error ? err.message : 'Sync failed')
    })
  }

  const toggleSectionPlane = () => {
    const state = !sectionPlaneActive
    setSectionPlaneActive(state)
    viewerRef.current?.setSectionPlane(state)
  }

  const toggleMeasurementMode = () => {
    const state = !measurementActive
    setMeasurementActive(state)
    viewerRef.current?.setMeasurementMode(state)
  }

  const handleApplyFilter = () => {
    if (!filterProperty || !filterValue) return

    viewerRef.current?.applyFilter(filterProperty, filterValue)
    setActiveFilter({ property: filterProperty, value: filterValue })
  }

  const handleClearFilter = () => {
    viewerRef.current?.clearFilter()
    setActiveFilter(null)
    setFilterProperty('')
    setFilterValue('')
  }

  const toggleIsolateSelected = () => {
    const state = !isolateMode
    setIsolateMode(state)
    setHideMode(false)

    if (state && selectedElements?.length) {
      viewerRef.current?.isolateObjects(selectedElements)
    } else viewerRef.current?.unIsolateObjects()
  }

  const toggleHideSelected = () => {
    const state = !hideMode
    setHideMode(state)
    setIsolateMode(false)

    if (state && selectedElements?.length) {
      viewerRef.current?.hideObjects(selectedElements)
    } else viewerRef.current?.showObjects()
  }

  const handleApplyColoring = () => {
    if (!colorByProperty) return

    const colorMap = {
      Walls: '#FF0000',
      Floors: '#00FF00',
      Roofs: '#0000FF',
      Columns: '#FFFF00',
      Doors: '#FF00FF',
      Windows: '#00FFFF',
      Uncategorized: '#AAAAAA'
    }

    viewerRef.current?.setColorByProperty(colorByProperty, colorMap, '#CCCCCC')
    setIsColoringActive(true)
  }

  const handleClearColoring = () => {
    viewerRef.current?.resetFilters()
    setIsColoringActive(false)
    setColorByProperty('')
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold">3D Model Viewer</h2>
            <p className="text-sm text-gray-500">Connect to Speckle to view models</p>
          </div>

          {speckleInfo.connected && (
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                isLive ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
              }`}
            >
              {isLive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{isLive ? 'Live' : 'Polling'}</span>
            </div>
          )}
        </div>

        <Button onClick={handleSyncElements} disabled={syncing || !speckleInfo.connected}>
          <Zap className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Speckle Elements'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* VIEWER */}
        <div className="lg:col-span-3">
          <SpeckleViewer
            ref={viewerRef}
            project={project}
            onElementSelect={handleElementSelection}
            selectedElements={selectedElements}
            onConnectionChange={handleConnectionState}
            sectionPlaneActive={sectionPlaneActive}
            measurementActive={measurementActive}
            filterProperties={activeFilter || undefined}
            isolateElements={isolateMode ? selectedElements : undefined}
            hideElements={hideMode ? selectedElements : undefined}
          />
        </div>

        {/* SIDE PANEL */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scissors className="h-5 w-5" />
                <span>Viewer Tools</span>
              </CardTitle>
              <CardDescription>Interact with the model</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Section */}
              <div className="flex items-center justify-between">
                <Label>Section Plane</Label>
                <Switch checked={sectionPlaneActive} onCheckedChange={toggleSectionPlane} />
              </div>

              {/* Measurement */}
              <div className="flex items-center justify-between">
                <Label>Measurement Tool</Label>
                <Switch checked={measurementActive} onCheckedChange={toggleMeasurementMode} />
              </div>

              <Separator />

              {/* Isolate & Hide */}
              <div>
                <Label>Selected Elements ({selectedElements?.length || 0})</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={isolateMode ? 'default' : 'outline'}
                    onClick={toggleIsolateSelected}
                    size="sm"
                  >
                    {isolateMode ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                    {isolateMode ? 'Show All' : 'Isolate'}
                  </Button>

                  <Button
                    variant={hideMode ? 'default' : 'outline'}
                    onClick={toggleHideSelected}
                    size="sm"
                  >
                    {hideMode ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                    {hideMode ? 'Show All' : 'Hide'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtering */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Advanced Filtering</span>
              </CardTitle>
              <CardDescription>Filter model elements</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label>Property Name</Label>
                <Input value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)} />
              </div>

              <div>
                <Label>Property Value</Label>
                <Input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleApplyFilter}>
                  Apply Filter
                </Button>

                <Button className="flex-1" variant="outline" onClick={handleClearFilter}>
                  <X className="h-4 w-4 mr-2" /> Clear
                </Button>
              </div>

              {activeFilter && (
                <p className="text-sm text-gray-700">
                  Active: <b>{activeFilter.property}</b> = <b>{String(activeFilter.value)}</b>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Coloring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Property Coloring</span>
              </CardTitle>
              <CardDescription>Color elements based on property</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Label>Property</Label>
              <Select value={colorByProperty} onValueChange={setColorByProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="level">Level</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleApplyColoring} disabled={isColoringActive}>
                  Apply
                </Button>

                <Button className="flex-1" variant="outline" onClick={handleClearColoring}>
                  <X className="h-4 w-4 mr-2" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <ElementPropertiesPanel element={selectedElementData} />
        </div>
      </div>
    </div>
  )
}
