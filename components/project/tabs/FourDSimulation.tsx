/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import SpeckleViewer, { SpeckleViewerRef } from '../SpeckleViewer'
import SimulationControl from './SimulationControl'
import TaskInformationPanel from './TaskInformationPanel'
import { parseISO, isBefore, isAfter, addDays } from 'date-fns'
import { formatDate, downloadFile, calculateCriticalPath } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Camera, Video, StopCircle, Share2, Loader2, RefreshCw, AlertTriangle, Info, Layers } from 'lucide-react'
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
    IN_PROGRESS_PARTIAL: '#60A5FA', // Lighter Blue for partial progress
    COMPLETED: '#16A34A',   // Green
    CRITICAL: '#DC2626',    // Red for critical path
  },
  ACTUAL: {
    AHEAD: '#10B981',      // Emerald (completed before planned end)
    ON_TIME: '#16A34A',    // Green (completed on or near planned end)
    BEHIND: '#F97316',     // Orange (completed after planned end)
    IN_PROGRESS: '#3B82F6', // Blue
    IN_PROGRESS_PARTIAL: '#60A5FA', // Lighter Blue for partial progress
    NOT_STARTED: '#CCCCCC', // Light Grey (Ghosted)
    COMPLETED_GHOST: '#6B7280', // Darker Grey for completed elements not in focus
    CRITICAL: '#DC2626',    // Red for critical path
  },
}

// Visualization modes for progress representation
type ProgressVisualizationMode = 'element-count' | 'opacity' | 'color-gradient'

// Helper function to interpolate between two hex colors
function interpolateColor(color1: string, color2: string, ratio: number): string {
  // Convert hex to RGB
  const hex2rgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }
  
  const rgb1 = hex2rgb(color1)
  const rgb2 = hex2rgb(color2)
  
  // Interpolate
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio)
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio)
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio)
  
  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
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
  const [visualizationMode, setVisualizationMode] = useState<ProgressVisualizationMode>('element-count')

  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = async () => {
    // Only show loading spinner on initial load or explicit refresh
    if (links.length === 0 && tasks.length === 0) setLoadingData(true)
    try {
      const [linksRes, tasksRes] = await Promise.all([
        fetch(`/api/links?projectId=${project.id}`, { credentials: 'include' }),
        fetch(`/api/projects/${project.id}/tasks`, { credentials: 'include' })
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

  // Track active tasks for the task information panel
  const [activeTasks, setActiveTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any | null>(null)

  useEffect(() => {
    if (!viewerRef.current || links.length === 0) return

    const allElementGuids = links.map(link => link.element.guid)
    viewerRef.current.isolateObjects(allElementGuids, true) // Ghost all elements first

    const colorFilters: any[] = []
    const visibleGuids: string[] = []
    const currentActiveTasks: any[] = []
    const taskElementMap = new Map<number, string[]>() // Track elements per task
    
    // Group links by task to calculate progress-based visibility
    const linksByTask = new Map<number, typeof links>()
    links.forEach(link => {
      if (!linksByTask.has(link.task.id)) {
        linksByTask.set(link.task.id, [])
      }
      linksByTask.get(link.task.id)!.push(link)
    })

    // Process each task's elements with progress-based visibility
    linksByTask.forEach((taskLinks, taskId) => {
      const firstLink = taskLinks[0]
      const task = firstLink.task
      
      // Prioritize link-specific dates, fall back to task dates
      const plannedStart = firstLink.startDate ? parseISO(firstLink.startDate) : parseISO(task.startDate)
      const plannedEnd = firstLink.endDate ? parseISO(firstLink.endDate) : parseISO(task.endDate)
      const actualStart = task.actualStartDate ? parseISO(task.actualStartDate) : null
      const actualEnd = task.actualEndDate ? parseISO(task.actualEndDate) : null
      const isTaskCritical = criticalPathTasks.has(task.id) && showCriticalPath

      if (mode === 'planned') {
        const taskProgress = Number(task.progress || 0)
        const isTaskCompleted = taskProgress >= 100 || 
                               task.status === 'completed' || 
                               task.status === 'done'
        
        // Calculate if task should be visible based on date
        const taskDuration = (plannedEnd.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24)
        const daysPassed = (currentDate.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24)
        const expectedProgress = Math.min(100, Math.max(0, (daysPassed / taskDuration) * 100))
        
        let shouldShowTask = false
        let taskColor = STATUS_COLORS.PLANNED.NOT_STARTED
        
        if (isBefore(currentDate, plannedStart)) {
          // Task hasn't started yet - hide all elements
          shouldShowTask = false
        } else if (!isAfter(currentDate, plannedEnd)) { 
          // Date within task range - show based on progress
          if (taskProgress > 0) {
            shouldShowTask = true
            
            // Determine color based on progress
            if (taskProgress >= 100) {
              taskColor = isTaskCritical ? STATUS_COLORS.PLANNED.CRITICAL : STATUS_COLORS.PLANNED.COMPLETED
            } else if (taskProgress >= expectedProgress) {
              taskColor = isTaskCritical ? STATUS_COLORS.PLANNED.CRITICAL : STATUS_COLORS.PLANNED.IN_PROGRESS
            } else {
              taskColor = '#F97316' // Orange - behind schedule
            }
            
            // Track active task
            if (!taskElementMap.has(task.id)) {
              taskElementMap.set(task.id, [])
              currentActiveTasks.push(task)
            }
          }
        } else if (isAfter(currentDate, plannedEnd)) {
          // Date passed task end
          if (isTaskCompleted) {
            shouldShowTask = true
            taskColor = isTaskCritical ? STATUS_COLORS.PLANNED.CRITICAL : STATUS_COLORS.PLANNED.COMPLETED
          } else if (taskProgress > 0) {
            shouldShowTask = true
            taskColor = '#F97316' // Orange - delayed
          }
        }
        
        // **ENHANCED: Multiple visualization modes for progress**
        if (shouldShowTask && taskProgress > 0) {
          const totalElements = taskLinks.length
          const sortedLinks = [...taskLinks].sort((a, b) => 
            a.element.guid.localeCompare(b.element.guid)
          )
          
          if (visualizationMode === 'element-count') {
            // MODE 1: Show only percentage of elements (current implementation)
            const elementsToShow = Math.ceil((taskProgress / 100) * totalElements)
            
            sortedLinks.forEach((link, index) => {
              if (index < elementsToShow) {
                visibleGuids.push(link.element.guid)
                colorFilters.push({ 
                  property: { key: 'id', value: link.element.guid }, 
                  color: taskColor 
                })
                
                if (taskElementMap.has(task.id)) {
                  taskElementMap.get(task.id)!.push(link.element.guid)
                }
              } else {
                colorFilters.push({ 
                  property: { key: 'id', value: link.element.guid }, 
                  color: STATUS_COLORS.PLANNED.NOT_STARTED 
                })
              }
            })
          } else if (visualizationMode === 'opacity') {
            // MODE 2: Show all elements with opacity based on progress
            // Elements fade in as progress increases
            sortedLinks.forEach((link, index) => {
              visibleGuids.push(link.element.guid)
              
              // Calculate opacity: 0.3 (ghosted) to 1.0 (full)
              const opacity = 0.3 + (taskProgress / 100) * 0.7
              
              // Use lighter color for partial progress
              const progressColor = taskProgress < 100 
                ? STATUS_COLORS.PLANNED.IN_PROGRESS_PARTIAL 
                : taskColor
              
              colorFilters.push({ 
                property: { key: 'id', value: link.element.guid }, 
                color: progressColor,
                opacity: opacity
              })
              
              if (taskElementMap.has(task.id)) {
                taskElementMap.get(task.id)!.push(link.element.guid)
              }
            })
          } else if (visualizationMode === 'color-gradient') {
            // MODE 3: Color gradient from grey to full color based on progress
            sortedLinks.forEach((link, index) => {
              visibleGuids.push(link.element.guid)
              
              // Interpolate between grey and task color
              const greyColor = STATUS_COLORS.PLANNED.NOT_STARTED
              const progressRatio = taskProgress / 100
              
              // Simple color interpolation (grey to task color)
              const interpolatedColor = interpolateColor(greyColor, taskColor, progressRatio)
              
              colorFilters.push({ 
                property: { key: 'id', value: link.element.guid }, 
                color: interpolatedColor
              })
              
              if (taskElementMap.has(task.id)) {
                taskElementMap.get(task.id)!.push(link.element.guid)
              }
            })
          }
        } else {
          // Task not visible - ghost all elements
          taskLinks.forEach(link => {
            colorFilters.push({ 
              property: { key: 'id', value: link.element.guid }, 
              color: STATUS_COLORS.PLANNED.NOT_STARTED 
            })
          })
        }
      } else { // mode === 'actual'
        const taskProgress = Number(task.progress || 0)
        const isTaskCompleted = taskProgress >= 100 || 
                               task.status === 'completed' || 
                               task.status === 'done'
        
        let shouldShowTask = false
        let taskColor = STATUS_COLORS.ACTUAL.NOT_STARTED
        
        if (actualStart && !isBefore(currentDate, actualStart)) {
          if (actualEnd && isAfter(currentDate, actualEnd)) {
            // Task completed (actual)
            if (isTaskCompleted) {
              shouldShowTask = true
              if (isBefore(actualEnd, plannedEnd)) {
                taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.AHEAD
              } else if (isAfter(actualEnd, plannedEnd)) {
                taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.BEHIND
              } else {
                taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.ON_TIME
              }
            }
          } else {
            // Task in progress (actual)
            if (taskProgress > 0) {
              shouldShowTask = true
              taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.IN_PROGRESS
              
              // Track active task
              if (!taskElementMap.has(task.id)) {
                taskElementMap.set(task.id, [])
                currentActiveTasks.push(task)
              }
            }
          }
        } else if (!actualStart && isAfter(currentDate, plannedEnd)) {
          // No actual start but planned date passed
          if (taskProgress > 0) {
            shouldShowTask = true
            taskColor = '#F97316' // Orange - delayed/not started
          }
        }
        
        // **ENHANCED: Multiple visualization modes for progress (Actual mode)**
        if (shouldShowTask && taskProgress > 0) {
          const totalElements = taskLinks.length
          const sortedLinks = [...taskLinks].sort((a, b) => 
            a.element.guid.localeCompare(b.element.guid)
          )
          
          if (visualizationMode === 'element-count') {
            // MODE 1: Show only percentage of elements
            const elementsToShow = Math.ceil((taskProgress / 100) * totalElements)
            
            sortedLinks.forEach((link, index) => {
              if (index < elementsToShow) {
                visibleGuids.push(link.element.guid)
                colorFilters.push({ 
                  property: { key: 'id', value: link.element.guid }, 
                  color: taskColor 
                })
                
                if (taskElementMap.has(task.id)) {
                  taskElementMap.get(task.id)!.push(link.element.guid)
                }
              } else {
                colorFilters.push({ 
                  property: { key: 'id', value: link.element.guid }, 
                  color: STATUS_COLORS.ACTUAL.NOT_STARTED 
                })
              }
            })
          } else if (visualizationMode === 'opacity') {
            // MODE 2: Show all elements with opacity
            sortedLinks.forEach((link) => {
              visibleGuids.push(link.element.guid)
              
              const opacity = 0.3 + (taskProgress / 100) * 0.7
              const progressColor = taskProgress < 100 
                ? STATUS_COLORS.ACTUAL.IN_PROGRESS_PARTIAL 
                : taskColor
              
              colorFilters.push({ 
                property: { key: 'id', value: link.element.guid }, 
                color: progressColor,
                opacity: opacity
              })
              
              if (taskElementMap.has(task.id)) {
                taskElementMap.get(task.id)!.push(link.element.guid)
              }
            })
          } else if (visualizationMode === 'color-gradient') {
            // MODE 3: Color gradient
            sortedLinks.forEach((link) => {
              visibleGuids.push(link.element.guid)
              
              const greyColor = STATUS_COLORS.ACTUAL.NOT_STARTED
              const progressRatio = taskProgress / 100
              const interpolatedColor = interpolateColor(greyColor, taskColor, progressRatio)
              
              colorFilters.push({ 
                property: { key: 'id', value: link.element.guid }, 
                color: interpolatedColor
              })
              
              if (taskElementMap.has(task.id)) {
                taskElementMap.get(task.id)!.push(link.element.guid)
              }
            })
          }
        } else {
          taskLinks.forEach(link => {
            colorFilters.push({ 
              property: { key: 'id', value: link.element.guid }, 
              color: STATUS_COLORS.ACTUAL.NOT_STARTED 
            })
          })
        }
      }
    })



    // Update active tasks with element counts
    const tasksWithCounts = currentActiveTasks.map(task => ({
      ...task,
      elementCount: taskElementMap.get(task.id)?.length || 0
    }))
    setActiveTasks(tasksWithCounts)

    // Apply visibility and colors to viewer
    console.log('🎬 Applying visualization:', {
      mode: visualizationMode,
      visibleCount: visibleGuids.length,
      totalElements: allElementGuids.length,
      colorFilters: colorFilters.length,
      activeTasks: currentActiveTasks.length
    })

    if (visualizationMode === 'element-count') {
      // For element count mode: hide elements not in visibleGuids
      const hiddenGuids = allElementGuids.filter(guid => !visibleGuids.includes(guid))
      
      console.log(`  👁️ Visibility: ${visibleGuids.length} visible, ${hiddenGuids.length} hidden`)
      
      if (hiddenGuids.length > 0) {
        viewerRef.current.hideObjects(hiddenGuids)
      }
      
      if (visibleGuids.length > 0) {
        viewerRef.current.showObjects(visibleGuids)
      }
    } else {
      // For opacity and gradient modes: show all elements
      console.log(`  👁️ Showing all ${allElementGuids.length} elements`)
      viewerRef.current.showObjects(allElementGuids)
    }

    // Log color filters being applied
    console.log('🎨 Color filters to apply:', colorFilters.slice(0, 5).map(cf => ({
      id: cf.property?.value?.substring(0, 8) + '...',
      color: cf.color,
      opacity: cf.opacity
    })))

    // Apply color filters
    viewerRef.current.setColorFilter({
      property: 'id',
      multiple: colorFilters,
      default_color: STATUS_COLORS.PLANNED.NOT_STARTED,
    })

  }, [currentDate, links, mode, criticalPathTasks, showCriticalPath, visualizationMode])

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
          credentials: 'include',
          body: formData,
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to export video to server')
        }
        
        // If download URL is provided, trigger download
        if (data.downloadUrl) {
          const downloadLink = document.createElement('a')
          downloadLink.href = `/api${data.downloadUrl}`
          downloadLink.download = data.fileName
          downloadLink.click()
        }
        
        resolve(data.message)
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
          {/* Visualization Mode Selector */}
          <div className="flex items-center space-x-2 border rounded-md p-1 bg-white">
            <Button 
              variant={visualizationMode === 'element-count' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setVisualizationMode('element-count')}
              className="h-8 px-3"
            >
              <Layers className="h-3 w-3 mr-1" />
              Count
            </Button>
            <Button 
              variant={visualizationMode === 'opacity' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setVisualizationMode('opacity')}
              className="h-8 px-3"
            >
              <Info className="h-3 w-3 mr-1" />
              Opacity
            </Button>
            <Button 
              variant={visualizationMode === 'color-gradient' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setVisualizationMode('color-gradient')}
              className="h-8 px-3"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Gradient
            </Button>
          </div>
          
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

      {/* Visualization Mode Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Progress Visualization: {
                  visualizationMode === 'element-count' ? 'Element Count' :
                  visualizationMode === 'opacity' ? 'Opacity Mode' :
                  'Color Gradient'
                }
              </h3>
              <p className="text-xs text-blue-800">
                {visualizationMode === 'element-count' && 
                  'Shows only the percentage of elements matching task progress. 20% progress = 2 out of 10 elements visible.'}
                {visualizationMode === 'opacity' && 
                  'All elements visible with opacity based on progress. 20% progress = all elements at 30-50% opacity.'}
                {visualizationMode === 'color-gradient' && 
                  'All elements visible with color transitioning from grey to full color based on progress.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 3D Viewer - Takes 2 columns */}
        <div className="lg:col-span-2 relative">
          <Card className="h-[700px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>3D Model Viewer</span>
                {/* Date/Time Display in Header */}
                <div className="flex items-center space-x-2 text-xs bg-blue-100 text-blue-900 px-3 py-1 rounded-md">
                  <span className="font-semibold">{formatDate(currentDate)}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              <div className="relative h-full">
                <SpeckleViewer ref={viewerRef} project={project} viewerCanvasRef={viewerCanvasRef} />
                {/* Legend Overlay */}
                <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 p-3 rounded-lg shadow-lg text-xs">
                  <div className="font-semibold text-gray-900 mb-2">Color Legend</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.PLANNED.NOT_STARTED }}></div>
                      <span>Not Started</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.PLANNED.IN_PROGRESS }}></div>
                      <span>In Progress</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.PLANNED.COMPLETED }}></div>
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-orange-500"></div>
                      <span>Behind/Delayed</span>
                    </div>
                    {showCriticalPath && (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.PLANNED.CRITICAL }}></div>
                        <span>Critical Path</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Controls and Task Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simulation Controls */}
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

          {/* Task Information Panel */}
          <TaskInformationPanel
            activeTasks={activeTasks}
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
            currentDate={currentDate}
            mode={mode}
          />

          {/* Export & Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Video className="h-4 w-4" />
                <span>Export & Capture</span>
              </CardTitle>
              <CardDescription className="text-xs">Record simulation videos or take screenshots</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={takeScreenshot} className="w-full" size="sm" disabled={isRecording || !viewerCanvasRef.current}>
                <Camera className="h-4 w-4 mr-2" />
                Take Screenshot
              </Button>
              {!isRecording ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={startRecording} size="sm" className="w-full" disabled={!viewerCanvasRef.current}>
                    <Video className="h-4 w-4 mr-2" />
                    Record Video
                  </Button>
                  <Button onClick={startRecordingForServerExport} size="sm" variant="outline" className="w-full" disabled={!viewerCanvasRef.current || isExportingVideo}>
                    {isExportingVideo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                    Export
                  </Button>
                </div>
              ) : (
                <Button onClick={stopRecording} size="sm" className="w-full bg-red-600 hover:bg-red-700" disabled={!viewerCanvasRef.current}>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}