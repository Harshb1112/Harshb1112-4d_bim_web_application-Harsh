'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Calendar, Clock, DollarSign, Users, Play, Pause, SkipBack, SkipForward, Maximize2, Settings, RefreshCw, Video, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Viewer360 from './Viewer360'
import TimelineSlider from './TimelineSlider'
import CostPanel from './CostPanel'
import ProgressPanel from './ProgressPanel'
import CameraSelector from './CameraSelector'

interface ViewSiteClientProps {
  project: any
  user: any
}

export default function ViewSiteClient({ project, user }: ViewSiteClientProps) {
  const router = useRouter()
  const [siteData, setSiteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'live' | 'timelapse' | '3d'>('live')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [selectedCamera, setSelectedCamera] = useState<any>(null)
  const [currentCapture, setCurrentCapture] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Fetch site data
  const fetchSiteData = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch(`/api/site-view/${project.id}?date=${dateStr}`)
      if (response.ok) {
        const data = await response.json()
        setSiteData(data)
        if (data.cameras?.length > 0 && !selectedCamera) {
          setSelectedCamera(data.cameras[0])
        }
        if (data.capturesForDate?.length > 0) {
          setCurrentCapture(data.capturesForDate[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch site data:', error)
    } finally {
      setLoading(false)
    }
  }, [project.id, selectedDate, selectedCamera])

  useEffect(() => {
    fetchSiteData()
  }, [fetchSiteData])

  // Auto-refresh for live mode
  useEffect(() => {
    if (viewMode === 'live') {
      const interval = setInterval(fetchSiteData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [viewMode, fetchSiteData])

  // Timelapse playback
  useEffect(() => {
    if (isPlaying && viewMode === 'timelapse' && siteData?.captures?.length > 0) {
      const interval = setInterval(() => {
        const currentIndex = siteData.captures.findIndex((c: any) => c.id === currentCapture?.id)
        const nextIndex = (currentIndex + 1) % siteData.captures.length
        setCurrentCapture(siteData.captures[nextIndex])
        setSelectedDate(new Date(siteData.captures[nextIndex].capturedAt))
      }, 2000 / playbackSpeed)
      return () => clearInterval(interval)
    }
  }, [isPlaying, viewMode, siteData, currentCapture, playbackSpeed])

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    setIsPlaying(false)
  }

  const handleCaptureSelect = (capture: any) => {
    setCurrentCapture(capture)
    setSelectedDate(new Date(capture.capturedAt))
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting to live 360° camera...</p>
          <p className="text-gray-500 text-sm mt-2">Powered by Hikvision pole-mounted camera</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/project/${project.id}`)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
            <div>
              <h1 className="text-xl font-bold">{project.name} - Live Site View</h1>
              <p className="text-sm text-gray-400">
                {project.location || 'Construction Site'} • Hikvision Pole-mounted Camera
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={viewMode === 'live' ? 'default' : 'secondary'} className="bg-red-600">
              <span className="animate-pulse mr-1">●</span> LIVE
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchSiteData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main Viewer Area */}
        <div className="flex-1 flex flex-col">
          {/* View Mode Tabs */}
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="bg-gray-700">
                <TabsTrigger value="live" className="data-[state=active]:bg-blue-600">
                  <Video className="h-4 w-4 mr-2" />
                  Live 360°
                </TabsTrigger>
                <TabsTrigger value="timelapse" className="data-[state=active]:bg-blue-600">
                  <Clock className="h-4 w-4 mr-2" />
                  Time-lapse
                </TabsTrigger>
                <TabsTrigger value="3d" className="data-[state=active]:bg-blue-600">
                  <Image className="h-4 w-4 mr-2" />
                  3D Model
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Hikvision Camera Viewer */}
          <div className="flex-1 relative">
            <Viewer360 
              camera={selectedCamera}
              capture={currentCapture}
              viewMode={viewMode}
              isLive={viewMode === 'live'}
              projectId={project.id}
            />
            
            {/* Overlay Info */}
            <div className="absolute top-4 left-4 bg-black/70 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span>{selectedDate.toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Clock className="h-4 w-4 text-green-400" />
                <span>{selectedDate.toLocaleTimeString('en-IN')}</span>
              </div>
              {currentCapture?.weather && (
                <div className="text-sm mt-1 text-gray-400">
                  Weather: {currentCapture.weather} {currentCapture.temperature && `(${currentCapture.temperature}°C)`}
                </div>
              )}
            </div>

            {/* Camera Info */}
            {selectedCamera && (
              <div className="absolute top-4 right-4 bg-black/70 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">{selectedCamera.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {selectedCamera.brand} {selectedCamera.model}
                </div>
                {selectedCamera.location && (
                  <div className="text-xs text-gray-400">{selectedCamera.location}</div>
                )}
              </div>
            )}

            {/* Progress Overlay */}
            {siteData?.progress && (
              <div className="absolute bottom-20 left-4 bg-black/70 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-sm font-medium mb-2">Overall Progress</div>
                <div className="w-48 bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${siteData.progress.overall}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {siteData.progress.overall.toFixed(1)}% Complete
                </div>
              </div>
            )}
          </div>

          {/* Timeline Controls */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="flex items-center gap-4">
              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const captures = siteData?.captures || []
                    const currentIndex = captures.findIndex((c: any) => c.id === currentCapture?.id)
                    if (currentIndex > 0) {
                      handleCaptureSelect(captures[currentIndex - 1])
                    }
                  }}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const captures = siteData?.captures || []
                    const currentIndex = captures.findIndex((c: any) => c.id === currentCapture?.id)
                    if (currentIndex < captures.length - 1) {
                      handleCaptureSelect(captures[currentIndex + 1])
                    }
                  }}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Timeline Slider */}
              <div className="flex-1">
                <TimelineSlider
                  captures={siteData?.captures || []}
                  currentCapture={currentCapture}
                  onCaptureSelect={handleCaptureSelect}
                  projectStartDate={project.startDate}
                  projectEndDate={project.endDate}
                />
              </div>

              {/* Speed Control */}
              <div className="flex items-center gap-2 w-32">
                <span className="text-xs text-gray-400">Speed:</span>
                <Slider
                  value={[playbackSpeed]}
                  onValueChange={([v]) => setPlaybackSpeed(v)}
                  min={0.5}
                  max={4}
                  step={0.5}
                  className="w-20"
                />
                <span className="text-xs">{playbackSpeed}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <Tabs defaultValue="progress" className="h-full">
            <TabsList className="w-full bg-gray-700 rounded-none">
              <TabsTrigger value="progress" className="flex-1">Progress</TabsTrigger>
              <TabsTrigger value="costs" className="flex-1">Costs</TabsTrigger>
              <TabsTrigger value="cameras" className="flex-1">Cameras</TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="p-4 space-y-4">
              <ProgressPanel 
                progress={siteData?.progress}
                dailyProgress={siteData?.dailyProgress}
                selectedDate={selectedDate}
                projectId={project.id}
                onRefresh={fetchSiteData}
              />
            </TabsContent>

            <TabsContent value="costs" className="p-4">
              <CostPanel 
                costSummary={siteData?.costSummary}
                dailyCosts={siteData?.dailyCosts}
                selectedDate={selectedDate}
                projectId={project.id}
                onRefresh={fetchSiteData}
              />
            </TabsContent>

            <TabsContent value="cameras" className="p-4">
              <CameraSelector
                cameras={siteData?.cameras || []}
                selectedCamera={selectedCamera}
                onCameraSelect={setSelectedCamera}
                projectId={project.id}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
