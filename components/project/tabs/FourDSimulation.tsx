/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import UnifiedSimulationViewer, { UnifiedSimulationViewerRef } from '../viewers/UnifiedSimulationViewer'
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
import { VideoRecorder, RecordingOptions } from '@/lib/video-recorder'

interface FourDSimulationProps {
  project: any
}

interface Link {
  id: number
  element: { guid: string }
  task: {
    progress: number
    status: string
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
  const viewerRef = useRef<UnifiedSimulationViewerRef>(null)
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
  const [recordingFormat, setRecordingFormat] = useState<'webm' | 'mp4'>('webm')
  const [recordingQuality, setRecordingQuality] = useState<'hd' | 'fullhd' | '4k'>('fullhd')
  const [includeOverlay, setIncludeOverlay] = useState(true)

  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = async () => {
    // Only show loading spinner on initial load or explicit refresh
    if (links.length === 0 && tasks.length === 0) setLoadingData(true)
    try {
      const [linksRes, tasksRes] = await Promise.all([
        fetch(`/api/links?projectId=${project.id}`, { credentials: 'include' }),
        fetch(`/api/projects/${project.id}/tasks`, { credentials: 'include' })
      ])
      
      // Handle links response
      if (linksRes.ok) {
        const data = await linksRes.json()
        const fetchedLinks = data.links || []
        setLinks(fetchedLinks)
        
        if (fetchedLinks.length === 0) {
          console.warn('No element-task links found. 4D simulation will show tasks only.')
        }
      } else {
        const errorData = await linksRes.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to load links for simulation:', linksRes.status, errorData)
        setLinks([]) // Set empty array to continue
        
        // Only show error for server errors, not for empty data
        if (linksRes.status >= 500) {
          toast.error('Failed to load element-task links. 4D simulation may not work properly.')
        }
      }
      
      // Handle tasks response
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
        toast.error('Failed to load tasks. Please refresh the page.')
      }
    } catch (error) {
      console.error('Failed to load simulation data:', error)
      toast.error('Error loading simulation data. Please check your connection.')
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
      videoRecorderRef.current = new VideoRecorder(viewerCanvasRef.current, {
        format: recordingFormat,
        quality: recordingQuality,
        fps: 60,
        includeOverlay,
        overlayData: {
          projectName: project.name,
          date: formatDate(currentDate),
          progress: `${Math.round((activeTasks.filter(t => t.status === 'completed').length / Math.max(activeTasks.length, 1)) * 100)}%`,
        }
      })
    }
    return () => {
      videoRecorderRef.current?.dispose()
      videoRecorderRef.current = null
    }
  }, [viewerCanvasRef.current, recordingFormat, recordingQuality, includeOverlay])

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
    
    // TRUE 4D SIMULATION: 
    // Hide ALL elements first (empty array = hide all in Autodesk viewer)
    // Then show only the elements that should be visible based on timeline
    try {
      viewerRef.current.hideObjects([]) // Hide all elements
    } catch (e) {
      // Fallback: hide only linked elements
      viewerRef.current.hideObjects(allElementGuids)
    }

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

    // Process each task's elements with TIMELINE-BASED progress
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
        // Calculate TIMELINE-BASED progress (how much should be done by currentDate)
        const taskDuration = Math.max(1, (plannedEnd.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24))
        const daysPassed = (currentDate.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24)
        
        // Timeline progress: 0% before start, 0-100% during task, 100% after end
        let timelineProgress = 0
        if (isBefore(currentDate, plannedStart)) {
          timelineProgress = 0 // Task hasn't started yet
        } else if (isAfter(currentDate, plannedEnd)) {
          timelineProgress = 100 // Task should be complete
        } else {
          timelineProgress = Math.min(100, Math.max(0, (daysPassed / taskDuration) * 100))
        }
        
        // Determine visibility and color based on timeline position
        let shouldShowElements = false
        let taskColor = STATUS_COLORS.PLANNED.NOT_STARTED
        const actualProgress = Number(task.progress || 0)
        
        if (timelineProgress === 0) {
          // Before task start date - NO elements visible
          shouldShowElements = false
        } else if (timelineProgress > 0 && timelineProgress < 100) {
          // During task - show elements progressively based on timeline
          shouldShowElements = true
          
          // Color based on actual vs expected progress
          if (actualProgress >= timelineProgress) {
            taskColor = isTaskCritical ? STATUS_COLORS.PLANNED.CRITICAL : STATUS_COLORS.PLANNED.IN_PROGRESS
          } else {
            taskColor = '#F97316' // Orange - behind schedule
          }
          
          // Track as active task
          if (!taskElementMap.has(task.id)) {
            taskElementMap.set(task.id, [])
            currentActiveTasks.push(task)
          }
        } else {
          // After task end date - show all elements as completed
          shouldShowElements = true
          if (actualProgress >= 100) {
            taskColor = isTaskCritical ? STATUS_COLORS.PLANNED.CRITICAL : STATUS_COLORS.PLANNED.COMPLETED
          } else {
            taskColor = '#F97316' // Orange - delayed (should be done but isn't)
          }
        }
        
        // Apply visibility based on timeline progress
        if (shouldShowElements && timelineProgress > 0) {
          const totalElements = taskLinks.length
          const sortedLinks = [...taskLinks].sort((a, b) => 
            a.element.guid.localeCompare(b.element.guid)
          )
          
          if (visualizationMode === 'element-count') {
            // MODE 1: Show elements progressively based on TIMELINE progress
            // As timeline moves forward, more elements appear
            const elementsToShow = Math.ceil((timelineProgress / 100) * totalElements)
            
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
              }
              // Elements not yet reached by timeline stay HIDDEN (not ghosted)
            })
          } else if (visualizationMode === 'opacity') {
            // MODE 2: Show all task elements with opacity based on timeline progress
            sortedLinks.forEach((link) => {
              visibleGuids.push(link.element.guid)
              
              // Opacity increases as timeline progresses
              const opacity = 0.3 + (timelineProgress / 100) * 0.7
              const progressColor = timelineProgress < 100 
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
            // MODE 3: Color gradient from grey to full color based on timeline
            sortedLinks.forEach((link) => {
              visibleGuids.push(link.element.guid)
              
              const greyColor = STATUS_COLORS.PLANNED.NOT_STARTED
              const progressRatio = timelineProgress / 100
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
        }
        // Elements for tasks not yet started remain HIDDEN (not added to visibleGuids)
        
      } else { // mode === 'actual'
        // For actual mode, use actual dates and actual progress
        const startDate = actualStart || plannedStart
        const endDate = actualEnd || plannedEnd
        
        const taskDuration = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const daysPassed = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        
        let timelineProgress = 0
        if (isBefore(currentDate, startDate)) {
          timelineProgress = 0
        } else if (isAfter(currentDate, endDate)) {
          timelineProgress = 100
        } else {
          timelineProgress = Math.min(100, Math.max(0, (daysPassed / taskDuration) * 100))
        }
        
        const actualProgress = Number(task.progress || 0)
        let shouldShowElements = false
        let taskColor = STATUS_COLORS.ACTUAL.NOT_STARTED
        
        if (timelineProgress === 0) {
          shouldShowElements = false
        } else if (timelineProgress > 0 && timelineProgress < 100) {
          shouldShowElements = true
          
          if (actualProgress >= timelineProgress) {
            taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.IN_PROGRESS
          } else {
            taskColor = STATUS_COLORS.ACTUAL.BEHIND
          }
          
          if (!taskElementMap.has(task.id)) {
            taskElementMap.set(task.id, [])
            currentActiveTasks.push(task)
          }
        } else {
          shouldShowElements = true
          if (actualProgress >= 100) {
            // Completed - check if ahead, on time, or behind
            if (actualEnd && isBefore(actualEnd, plannedEnd)) {
              taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.AHEAD
            } else if (actualEnd && isAfter(actualEnd, plannedEnd)) {
              taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.BEHIND
            } else {
              taskColor = isTaskCritical ? STATUS_COLORS.ACTUAL.CRITICAL : STATUS_COLORS.ACTUAL.ON_TIME
            }
          } else {
            taskColor = STATUS_COLORS.ACTUAL.BEHIND // Should be done but isn't
          }
        }
        
        if (shouldShowElements && timelineProgress > 0) {
          const totalElements = taskLinks.length
          const sortedLinks = [...taskLinks].sort((a, b) => 
            a.element.guid.localeCompare(b.element.guid)
          )
          
          if (visualizationMode === 'element-count') {
            const elementsToShow = Math.ceil((timelineProgress / 100) * totalElements)
            
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
              }
            })
          } else if (visualizationMode === 'opacity') {
            sortedLinks.forEach((link) => {
              visibleGuids.push(link.element.guid)
              
              const opacity = 0.3 + (timelineProgress / 100) * 0.7
              const progressColor = timelineProgress < 100 
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
            sortedLinks.forEach((link) => {
              visibleGuids.push(link.element.guid)
              
              const greyColor = STATUS_COLORS.ACTUAL.NOT_STARTED
              const progressRatio = timelineProgress / 100
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
        }
      }
    })

    // Update active tasks with element counts
    const tasksWithCounts = currentActiveTasks.map(task => ({
      ...task,
      elementCount: taskElementMap.get(task.id)?.length || 0
    }))
    setActiveTasks(tasksWithCounts)

    // TRUE 4D SIMULATION: Apply visibility progressively
    // Only show elements that should be visible based on timeline
    if (visibleGuids.length > 0) {
      viewerRef.current.showObjects(visibleGuids)
    }
    
    // For opacity and gradient modes, we still only show elements that have started
    // (they're already in visibleGuids from the processing above)

    // Apply color filters to visible elements
    if (colorFilters.length > 0) {
      viewerRef.current.setColorFilter({
        property: 'id',
        multiple: colorFilters,
        default_color: STATUS_COLORS.PLANNED.NOT_STARTED,
      })
    }

  }, [currentDate, links, mode, criticalPathTasks, showCriticalPath, visualizationMode])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDate(prevDate => {
          const nextDay = addDays(prevDate, 1)
          if (isAfter(nextDay, projectTimeframe.end)) {
            setIsPlaying(false)
            
            // Auto-stop recording when simulation ends
            if (isRecording && videoRecorderRef.current) {
              setTimeout(() => {
                videoRecorderRef.current?.stop()
                toast.success('🎬 Recording completed! Video will download shortly...')
              }, 1000) // Small delay to capture final frame
            }
            
            return projectTimeframe.end
          }
          return nextDay
        })
      }, 1000 / playbackSpeed) // Adjust interval based on playback speed
    }
    return () => clearInterval(interval)
  }, [isPlaying, projectTimeframe.end, playbackSpeed, isRecording])

  // Fetch and track real-time cost data
  const [totalProjectCost, setTotalProjectCost] = useState<number>(0)

  useEffect(() => {
    // Fetch real cost data from API
    const fetchCost = async () => {
      try {
        const response = await fetch(`/api/resources/costs?projectId=${project.id}`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setTotalProjectCost(data.totalCost || 0)
        }
      } catch (error) {
        console.error('Failed to fetch cost data:', error)
      }
    }
    
    fetchCost()
    // Update cost every 5 seconds during recording
    const interval = isRecording ? setInterval(fetchCost, 5000) : null
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [project.id, isRecording])

  // Update overlay data during recording
  useEffect(() => {
    if (isRecording && videoRecorderRef.current && includeOverlay) {
      const completedTasks = activeTasks.filter(t => t.progress >= 100 || t.status === 'completed').length
      const totalTasks = tasks.length
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      
      // Get current active task name
      const currentTask = activeTasks.length > 0 ? activeTasks[0].name : 'No active tasks'
      
      // Format cost with Indian currency
      const formattedCost = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(totalProjectCost)
      
      videoRecorderRef.current.updateOverlayData({
        projectName: project.name,
        date: formatDate(currentDate),
        progress: `${overallProgress}%`,
        taskName: currentTask,
        completedTasks: `${completedTasks} / ${totalTasks}`,
        totalCost: formattedCost,
      })
    }
  }, [currentDate, activeTasks, tasks, isRecording, includeOverlay, project.name, totalProjectCost])

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

    // Reinitialize recorder with current settings
    videoRecorderRef.current.dispose()
    if (viewerCanvasRef.current) {
      videoRecorderRef.current = new VideoRecorder(viewerCanvasRef.current, {
        format: recordingFormat,
        quality: recordingQuality,
        fps: 60,
        includeOverlay,
        overlayData: {
          projectName: project.name,
          date: formatDate(currentDate),
          progress: `0%`,
        }
      })
    }

    // Reset to start and begin recording
    setCurrentDate(projectTimeframe.start)
    setIsPlaying(false) // Pause first to ensure clean start
    
    // Small delay to ensure viewer updates
    setTimeout(() => {
      setIsRecording(true)
      setIsPlaying(true) // Start simulation playback
      
      videoRecorderRef.current!.start((blob: Blob, format: string) => {
        // This callback runs when recording stops
        setIsRecording(false)
        setIsPlaying(false)
        const extension = format === 'mp4' ? 'mp4' : 'webm'
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm'
        const fileSize = (blob.size / 1024 / 1024).toFixed(2)
        downloadFile(blob, `4dbim_simulation_${recordingQuality}_${formatDate(new Date())}.${extension}`, mimeType)
        toast.success(`Video recorded! Size: ${fileSize} MB - Quality: ${recordingQuality.toUpperCase()} ${format.toUpperCase()}`)
      })
      
      const qualityText = recordingQuality === 'fullhd' ? 'Full HD (1920x1080)' : recordingQuality === '4k' ? '4K (3840x2160)' : 'HD (1280x720)'
      const duration = Math.ceil((projectTimeframe.end.getTime() - projectTimeframe.start.getTime()) / (1000 * 60 * 60 * 24))
      toast.info(`🎬 Recording started in ${qualityText} ${recordingFormat.toUpperCase()}. Duration: ~${duration} days. Simulation playing automatically...`)
    }, 500)
  }

  const stopRecording = () => {
    if (videoRecorderRef.current?.isRecording()) {
      videoRecorderRef.current.stop()
      toast.info('Recording stopped. Preparing video for download...')
    }
  }

  const handleConceptualServerExport = async (videoBlob: Blob, format: string) => {
    setIsExportingVideo(true)
    const promise = new Promise(async (resolve, reject) => {
      try {
        const extension = format === 'mp4' ? 'mp4' : 'webm'
        const fileName = `4dbim_simulation_${recordingQuality}_${formatDate(new Date())}.${extension}`
        const formData = new FormData()
        formData.append('video', videoBlob, fileName)
        formData.append('projectId', String(project.id))
        formData.append('fileName', fileName)

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

    // Reinitialize recorder with current settings
    videoRecorderRef.current.dispose()
    if (viewerCanvasRef.current) {
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.progress >= 100 || t.status === 'completed').length
      
      videoRecorderRef.current = new VideoRecorder(viewerCanvasRef.current, {
        format: recordingFormat,
        quality: recordingQuality,
        fps: 60,
        includeOverlay,
        overlayData: {
          projectName: project.name,
          date: formatDate(projectTimeframe.start),
          progress: `0%`,
          taskName: tasks.length > 0 ? tasks[0].name : 'Starting...',
          completedTasks: `0 / ${totalTasks}`,
          totalCost: '₹0',
        }
      })
    }

    setIsRecording(true)
    setIsPlaying(true) // Start simulation playback
    setCurrentDate(projectTimeframe.start) // Reset simulation to start
    
    videoRecorderRef.current.start((blob: Blob, format: string) => {
      // This callback runs when recording stops
      setIsRecording(false)
      setIsPlaying(false)
      handleConceptualServerExport(blob, format)
    })
    
    const qualityText = recordingQuality === 'fullhd' ? 'Full HD (1920x1080)' : recordingQuality === '4k' ? '4K (3840x2160)' : 'HD (1280x720)'
    toast.info(`Recording started in ${qualityText} ${recordingFormat.toUpperCase()} for server export.`)
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">4D Simulation</h2>
          <p className="text-sm text-gray-500">Watch the construction sequence unfold - model builds progressively from start to finish</p>
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

      {/* 4D Simulation Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                True 4D Simulation - {
                  visualizationMode === 'element-count' ? 'Progressive Build' :
                  visualizationMode === 'opacity' ? 'Opacity Fade-In' :
                  'Color Gradient'
                }
              </h3>
              <p className="text-xs text-blue-800">
                {visualizationMode === 'element-count' && 
                  'Model starts empty. Elements appear progressively as the timeline advances through each task. Task with 4 elements at 50% timeline = 2 elements visible.'}
                {visualizationMode === 'opacity' && 
                  'Model starts empty. Task elements fade in as timeline progresses. 25% through task = elements at 50% opacity.'}
                {visualizationMode === 'color-gradient' && 
                  'Model starts empty. Elements appear with color transitioning from grey to full status color as timeline advances.'}
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
                <UnifiedSimulationViewer ref={viewerRef} project={project} viewerCanvasRef={viewerCanvasRef} />
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
        <div className="lg:col-span-2 space-y-4">
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

          {/* Export & Capture - Moved before Task Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Video className="h-4 w-4" />
                <span>Export & Capture</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 space-y-3">
              {/* Recording Settings */}
              {!isRecording && (
                <div className="space-y-2 p-2 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Format Selection */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Format</label>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={recordingFormat === 'webm' ? 'default' : 'outline'}
                          onClick={() => setRecordingFormat('webm')}
                          className="flex-1 h-7 text-xs"
                        >
                          WebM
                        </Button>
                        <Button
                          size="sm"
                          variant={recordingFormat === 'mp4' ? 'default' : 'outline'}
                          onClick={() => setRecordingFormat('mp4')}
                          className="flex-1 h-7 text-xs"
                        >
                          MP4
                        </Button>
                      </div>
                    </div>

                    {/* Quality Selection */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Quality</label>
                      <select
                        value={recordingQuality}
                        onChange={(e) => setRecordingQuality(e.target.value as 'hd' | 'fullhd' | '4k')}
                        className="w-full h-7 text-xs border rounded-md px-2"
                      >
                        <option value="hd">HD (720p)</option>
                        <option value="fullhd">Full HD (1080p)</option>
                        <option value="4k">4K (2160p)</option>
                      </select>
                    </div>
                  </div>

                  {/* Overlay Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Include Info Overlay</label>
                    <button
                      onClick={() => setIncludeOverlay(!includeOverlay)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        includeOverlay ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          includeOverlay ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {includeOverlay && (
                    <div className="text-xs text-gray-500 italic">
                      Video will include project name, date, progress, and watermark
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={takeScreenshot} size="sm" disabled={isRecording || !viewerCanvasRef.current}>
                  <Camera className="h-4 w-4 mr-1" />
                  Screenshot
                </Button>
                {!isRecording ? (
                  <>
                    <Button onClick={startRecording} size="sm" disabled={!viewerCanvasRef.current}>
                      <Video className="h-4 w-4 mr-1" />
                      Record
                    </Button>
                    <Button onClick={startRecordingForServerExport} size="sm" variant="outline" disabled={!viewerCanvasRef.current || isExportingVideo}>
                      {isExportingVideo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Share2 className="h-4 w-4 mr-1" />}
                      Export
                    </Button>
                  </>
                ) : (
                  <Button onClick={stopRecording} size="sm" className="col-span-2 bg-red-600 hover:bg-red-700">
                    <StopCircle className="h-4 w-4 mr-1" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Information Panel - Compact height */}
          <div className="max-h-[280px] overflow-hidden">
            <TaskInformationPanel
              activeTasks={activeTasks}
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
              currentDate={currentDate}
              mode={mode}
            />
          </div>
        </div>
      </div>
    </div>
  )
}