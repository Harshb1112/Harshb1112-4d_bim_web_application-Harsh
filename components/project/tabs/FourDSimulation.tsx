/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import SpeckleViewer, { SpeckleViewerRef } from '../SpeckleViewer'
import SimulationControl from './SimulationControl'
import { parseISO, isBefore, isAfter, addDays } from 'date-fns'
import { formatDate, downloadFile, calculateCriticalPath } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Video, StopCircle, Share2, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import { VideoRecorder } from '@/lib/video-recorder'

interface FourDSimulationProps {
  project: any
}

interface Link {
  id: number
  element: { guid: string }
  task: {
    id: number
    name: string
    startDate: string
    endDate: string
    actualStartDate?: string
    actualEndDate?: string
    predecessors: Array<{ predecessor: { id: number } }>; // Added for critical path
    durationDays: number; // Added for critical path
  }
  startDate?: string // New field from ElementTaskLink
  endDate?: string   // New field from ElementTaskLink
}

const STATUS_COLORS = {
  PLANNED: {
    NOT_STARTED: '#CCCCCC', // Light Grey (Ghosted)
    IN_PROGRESS: '#3B82F6', // Blue
    COMPLETED: '#16A34A',   // Green
    CRITICAL: '#DC2626',    // Red for critical path
  },
  ACTUAL: {
    AHEAD: '#10B981',      // Emerald (completed before planned end)
    ON_TIME: '#16A34A',    // Green (completed on or near planned end)
    BEHIND: '#F97316',     // Orange (completed after planned end)
    IN_PROGRESS: '#3B82F6', // Blue
    NOT_STARTED: '#CCCCCC', // Light Grey (Ghosted)
    COMPLETED_GHOST: '#6B7280', // Darker Grey for completed elements not in focus
    CRITICAL: '#DC2626',    // Red for critical path
  },
}

export default function FourDSimulation({ project }: FourDSimulationProps) {
  const viewerRef = useRef<SpeckleViewerRef>(null)
  const viewerCanvasRef = useRef<HTMLCanvasElement | null>(null) // Ref to the viewer's canvas
  const videoRecorderRef = useRef<VideoRecorder | null>(null)

  const [links, setLinks] = useState<Link[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [mode, setMode] = useState<'planned' | 'actual'>('planned')
  const [playbackSpeed, setPlaybackSpeed] = useState(1) // 1x, 2x, 0.5x etc.
  const [isRecording, setIsRecording] = useState(false)
  const [isExportingVideo, setIsExportingVideo] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [criticalPathTasks, setCriticalPathTasks] = useState<Set<number>>(new Set())
  const [showCriticalPath, setShowCriticalPath] = useState(false)


  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = async () => {
    // Only show loading spinner on initial load or explicit refresh
    if (links.length === 0 && tasks.length === 0) setLoadingData(true)
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0]
      const [linksRes, tasksRes] = await Promise.all([
        fetch(`/api/links?projectId=${project.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/projects/${project.id}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])
      if (linksRes.ok) {
        const data = await linksRes.json()
        setLinks(data.links || [])
      } else {
        console.error('Failed to load links for simulation.')
      }
      if (tasksRes.ok) {
        const tasksData = (await tasksRes.json()).tasks || []
        setTasks(tasksData)
        if (tasksData.length > 0 && tasksData[0].startDate && !currentDate) {
          setCurrentDate(parseISO(tasksData[0].startDate))
        }
        // Calculate critical path
         
        const { criticalTasks: newCriticalTasks } = calculateCriticalPath(tasksData);
        setCriticalPathTasks(newCriticalTasks);

      } else {
        console.error('Failed to load tasks for simulation.')
      }
    } catch (error) {
      console.error('Failed to load simulation data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    fetchData() // Initial fetch

    // Set up polling for real-time-like updates
    fetchIntervalRef.current = setInterval(fetchData, 10000) // Poll every 10 seconds

    return () => {
      // Clean up interval on component unmount
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current)
      }
    }
   
  }, [project.id])

  // Initialize VideoRecorder when viewer is ready and canvas is available
  useEffect(() => {
    if (viewerRef.current && viewerCanvasRef.current && !videoRecorderRef.current) {
      videoRecorderRef.current = new VideoRecorder(viewerCanvasRef.current)
    }
    return () => {
      videoRecorderRef.current?.dispose()
      videoRecorderRef.current = null
    }
  }, [viewerCanvasRef.current])

  const projectTimeframe = useMemo(() => {
    if (tasks.length === 0) return { start: new Date(), end: new Date() }
    const allDates = tasks.flatMap(t => [
      t.startDate ? parseISO(t.startDate) : null,
      t.endDate ? parseISO(t.endDate) : null,
      t.actualStartDate ? parseISO(t.actualStartDate) : null,
      t.actualEndDate ? parseISO(t.actualEndDate) : null,
    ]).filter(d => d && !isNaN(d.getTime())) as Date[]

    links.forEach(link => {
      if (link.startDate) allDates.push(parseISO(link.startDate))
      if (link.endDate) allDates.push(parseISO(link.endDate))
    })

    if (allDates.length === 0) return { start: new Date(), end: new Date() }

    return {
      start: new Date(Math.min(...allDates.map(d => d.getTime()))),
      end: new Date(Math.max(...allDates.map(d => d.getTime()))),
    }
  }, [tasks, links])

  const milestones = useMemo(() => {
    return tasks
      .filter(task => task.startDate)
      .map(task => ({
        id: task.id,
        name: task.name,
        date: parseISO(task.startDate),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [tasks])

  useEffect(() => {
    if (!viewerRef.current || links.length === 0) return

    const allElementGuids = links.map(link => link.element.guid)
    viewerRef.current.isolateObjects(allElementGuids, true) // Ghost all elements first

    const colorFilters: any[] = []
    const visibleGuids: string[] = []

    links.forEach(link => {
      // Prioritize link-specific dates, fall back to task dates
      const plannedStart = link.startDate ? parseISO(link.startDate) : parseISO(link.task.startDate)
      const plannedEnd = link.endDate ? parseISO(link.endDate) : parseISO(link.task.endDate)
      const actualStart = link.task.actualStartDate ? parseISO(link.task.actualStartDate) : null
      const actualEnd = link.task.actualEndDate ? parseISO(link.task.actualEndDate) : null
      const isTaskCritical = criticalPathTasks.has(link.task.id) && showCriticalPath;

      let elementColor = STATUS_COLORS.PLANNED.NOT_STARTED // Default ghosted

      if (mode === 'planned') {
        if (isAfter(currentDate, plannedEnd)) { // Completed (Planned)
          visibleGuids.push(link.element.guid)
          elementColor = isTaskCritical ? STATUS_COLORS.PLANNED.CRITICAL : STATUS_COLORS.PLANNED.COMPLETED
        } else if (!isBefore(currentDate, plannedStart) && !isAfter(currentDate, plannedEnd)) { // In Progress (Planned)
          visibleGuids.push(link.element.guid)
          elementColor = isTaskCritical ? STATUS_COLORS.PLANNED.CRITICAL : STATUS_COLORS.PLANNED.IN_PROGRESS
        }
      } else { // mode === 'actual'
        if (actualEnd && isAfter(currentDate, actualEnd)) { // Completed (Actual)
          visibleGuids.push(link.element.guid)
          if (isBefore(actualEnd, plannedEnd)) {
            elementColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.AHEAD
          } else if (isAfter(actualEnd, plannedEnd)) {
            elementColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.BEHIND
          } else {
            elementColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.ON_TIME
          }
        } else if (actualStart && !isBefore(currentDate, actualStart) && (!actualEnd || !isAfter(currentDate, actualEnd))) { // In Progress (Actual)
          visibleGuids.push(link.element.guid)
          elementColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.IN_PROGRESS
        } else if (!actualStart && isAfter(currentDate, plannedEnd)) { // Planned completed, but no actual start/end
          visibleGuids.push(link.element.guid)
          elementColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.COMPLETED_GHOST // Indicate planned completion but no actual data
        }
      }
      colorFilters.push({ property: { key: 'id', value: link.element.guid }, color: elementColor })
    })

    if (visibleGuids.length > 0) {
      viewerRef.current.unIsolateObjects(visibleGuids)
    }

    viewerRef.current.setColorFilter({
      property: 'id',
      multiple: colorFilters,
      default_color: STATUS_COLORS.PLANNED.NOT_STARTED, // Elements not in any filter will be ghosted grey
    })

  }, [currentDate, links, mode, criticalPathTasks, showCriticalPath])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDate(prevDate => {
          const nextDay = addDays(prevDate, 1)
          if (isAfter(nextDay, projectTimeframe.end)) {
            setIsPlaying(false)
            return projectTimeframe.end
          }
          return nextDay
        })
      }, 1000 / playbackSpeed) // Adjust interval based on playback speed
    }
    return () => clearInterval(interval)
  }, [isPlaying, projectTimeframe.end, playbackSpeed])

  const takeScreenshot = async () => {
    if (!viewerCanvasRef.current) {
      toast.error('Viewer not ready for screenshot.')
      return
    }
    toast.loading('Taking screenshot...', { id: 'screenshot-toast' })
    try {
      const canvas = await html2canvas(viewerCanvasRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Transparent background
      })
      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `4dbim_screenshot_${formatDate(currentDate)}.png`, 'image/png')
          toast.success('Screenshot captured!', { id: 'screenshot-toast' })
        } else {
          throw new Error('Failed to create blob from canvas.')
        }
      }, 'image/png')
    } catch (error) {
      console.error('Screenshot failed:', error)
      toast.error('Failed to capture screenshot.', { id: 'screenshot-toast' })
    }
  }

  const startRecording = () => {
    if (!videoRecorderRef.current) {
      toast.error('Video recorder not initialized.')
      return
    }
    setIsRecording(true)
    setIsPlaying(true) // Start simulation playback
    setCurrentDate(projectTimeframe.start) // Reset simulation to start
    videoRecorderRef.current.start((blob: Blob) => {
      // This callback runs when recording stops
      setIsRecording(false)
      setIsPlaying(false)
      downloadFile(blob, `4dbim_simulation_${formatDate(new Date())}.webm`, 'video/webm')
      toast.success('Video recorded and downloaded!')
    })
    toast.info('Recording started. Simulation will play automatically.')
  }

  const stopRecording = () => {
    if (videoRecorderRef.current?.isRecording()) {
      videoRecorderRef.current.stop()
      toast.info('Recording stopped. Preparing video for download...')
    }
  }

  const handleConceptualServerExport = async (videoBlob: Blob) => {
    setIsExportingVideo(true)
    const promise = new Promise(async (resolve, reject) => {
      try {
        const formData = new FormData()
        formData.append('video', videoBlob, `4dbim_simulation_${formatDate(new Date())}.webm`)
        formData.append('projectId', String(project.id))
        formData.append('fileName', `4dbim_simulation_${formatDate(new Date())}.webm`)

        const token = document.cookie.split('token=')[1]?.split(';')[0]
        const response = await fetch('/api/video-export', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to export video to server')
        }
        resolve(data.message + (data.downloadUrl ? ` Download: ${data.downloadUrl}` : ''))
      } catch (error) {
        reject(error)
      } finally {
        setIsExportingVideo(false)
      }
    })

    toast.promise(promise, {
      loading: 'Sending video to server (conceptual)...',
      success: (message) => `Server export initiated: ${message}`,
      error: (err) => `Server export failed: ${err.message}`,
    })
  }

  const startRecordingForServerExport = () => {
    if (!videoRecorderRef.current) {
      toast.error('Video recorder not initialized.')
      return
    }
    setIsRecording(true)
    setIsPlaying(true) // Start simulation playback
    setCurrentDate(projectTimeframe.start) // Reset simulation to start
    videoRecorderRef.current.start((blob: Blob) => {
      // This callback runs when recording stops
      setIsRecording(false)
      setIsPlaying(false)
      handleConceptualServerExport(blob)
    })
    toast.info('Recording started for server export. Simulation will play automatically.')
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">4D Simulation</h2>
          <p className="text-sm text-gray-500">Visualize construction progress over time</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loadingData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button 
            variant={showCriticalPath ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            disabled={criticalPathTasks.size === 0}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {showCriticalPath ? 'Hide Critical Path' : 'Show Critical Path'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative">
          <SpeckleViewer ref={viewerRef} project={project} viewerCanvasRef={viewerCanvasRef} />
          {/* Date/Time Overlay */}
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded-md pointer-events-none">
            {formatDate(currentDate)}
          </div>
        </div>
        <div>
          <SimulationControl
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            projectStartDate={projectTimeframe.start}
            projectEndDate={projectTimeframe.end}
            mode={mode}
            setMode={setMode}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            milestones={milestones}
          />
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-5 w-5" />
                <span>Export & Capture</span>
              </CardTitle>
              <CardDescription>Record simulation videos or take screenshots.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={takeScreenshot} className="w-full" disabled={isRecording || !viewerCanvasRef.current}>
                <Camera className="h-4 w-4 mr-2" />
                Take Screenshot
              </Button>
              {!isRecording ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={startRecording} className="w-full" disabled={!viewerCanvasRef.current}>
                    <Video className="h-4 w-4 mr-2" />
                    Record Video (Local)
                  </Button>
                  <Button onClick={startRecordingForServerExport} className="w-full" disabled={!viewerCanvasRef.current || isExportingVideo}>
                    {isExportingVideo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                    {isExportingVideo ? 'Exporting...' : 'Export to Server (Conceptual)'}
                  </Button>
                </div>
              ) : (
                <Button onClick={stopRecording} className="w-full bg-red-600 hover:bg-red-700" disabled={!viewerCanvasRef.current}>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Note: Server export is conceptual in this environment. Actual video encoding requires a dedicated backend service with FFmpeg.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}