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
    IN_PROGRESS_EARLY: '#FFEB3B', // Yellow - Early Progress (1-33%)
    IN_PROGRESS_MID: '#FFA500', // Orange - Mid Progress (34-66%)
    IN_PROGRESS_LATE: '#00BCD4', // Cyan - Late Progress (67-99%)
    IN_PROGRESS_PARTIAL: '#60A5FA', // Lighter Blue for partial progress
    COMPLETED: '#16A34A',   // Green
    CRITICAL: '#DC2626',    // Red for critical path
  },
  ACTUAL: {
    AHEAD: '#10B981',      // Emerald (completed before planned end)
    ON_TIME: '#16A34A',    // Green (completed on or near planned end)
    BEHIND: '#F97316',     // Orange (completed after planned end)
    IN_PROGRESS: '#3B82F6', // Blue
    IN_PROGRESS_EARLY: '#FFEB3B', // Yellow - Early Progress (1-33%)
    IN_PROGRESS_MID: '#FFA500', // Orange - Mid Progress (34-66%)
    IN_PROGRESS_LATE: '#00BCD4', // Cyan - Late Progress (67-99%)
    IN_PROGRESS_PARTIAL: '#60A5FA', // Lighter Blue for partial progress
    NOT_STARTED: '#CCCCCC', // Light Grey (Ghosted)
    COMPLETED: '#16A34A',   // Green - Completed
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

// Helper function to get color based on progress percentage
function getProgressColor(progress: number, mode: 'planned' | 'actual', isCritical: boolean = false): string {
  const colors = mode === 'planned' ? STATUS_COLORS.PLANNED : STATUS_COLORS.ACTUAL
  
  if (isCritical) return colors.CRITICAL
  
  if (progress === 0) {
    return colors.NOT_STARTED // Gray - Not Started
  } else if (progress >= 100) {
    return colors.COMPLETED // Green - Completed
  } else if (progress <= 33) {
    return colors.IN_PROGRESS_EARLY // Yellow - Early Progress (1-33%)
  } else if (progress <= 66) {
    return colors.IN_PROGRESS_MID // Orange - Mid Progress (34-66%)
  } else {
    return colors.IN_PROGRESS_LATE // Cyan - Late Progress (67-99%)
  }
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
  const [recordingMode, setRecordingMode] = useState<'current-view' | 'simulation-playback'>('simulation-playback')
  const [includeOverlay, setIncludeOverlay] = useState(true)
  const [skipEmptyDays, setSkipEmptyDays] = useState(true) // NEW: Skip days with no changes

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

    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    
    // CRITICAL FIX: Start timeline 7 days BEFORE first task
    // This ensures we see empty model at the beginning
    const startWithBuffer = addDays(earliestDate, -7)
    
    console.log('📅 [Project Timeframe]:', {
      firstTaskStart: formatDate(earliestDate),
      timelineStart: formatDate(startWithBuffer),
      timelineEnd: formatDate(latestDate),
      bufferDays: 7
    })

    return {
      start: startWithBuffer,
      end: latestDate,
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
    if (!viewerRef.current || links.length === 0) {
      console.log('⚠️ [4D Simulation] Viewer not ready or no links:', {
        hasViewer: !!viewerRef.current,
        linksCount: links.length
      })
      return
    }

    const allElementGuids = links.map(link => link.element.guid)
    
    console.log('🎬 [4D Simulation] ===== VISIBILITY UPDATE =====')
    console.log('🎬 [4D Simulation] Current Date:', formatDate(currentDate))
    console.log('🎬 [4D Simulation] Total Links:', links.length)
    console.log('🎬 [4D Simulation] Mode:', mode)
    console.log('🎬 [4D Simulation] Sample link GUIDs:', links.slice(0, 3).map(l => l.element.guid))
    
    // Check if we're on the final day
    const isOnFinalDay = !isBefore(currentDate, projectTimeframe.end) && 
                        !isAfter(currentDate, addDays(projectTimeframe.end, 1))
    if (isOnFinalDay) {
      console.log('🎨 [4D Simulation] ⭐ FINAL DAY DETECTED - Will use realistic materials for 100% complete tasks')
    }
    
    // TRUE 4D SIMULATION: 
    // CRITICAL FIX: Hide ALL elements FIRST before processing timeline
    // This ensures Day 1 starts with empty model
    try {
      // Method 1: Try to hide all elements in viewer
      viewerRef.current.hideObjects([])
      if (isRecording) {
        console.log(`🎬 [RECORDING] Step 1: Hiding ALL elements. Current date: ${formatDate(currentDate)}`)
      } else {
        console.log(`🎬 [4D Simulation] Step 1: Hiding ALL ${allElementGuids.length} elements`)
      }
    } catch (e) {
      // Method 2: Fallback - hide only linked elements
      viewerRef.current.hideObjects(allElementGuids)
      if (isRecording) {
        console.log(`🎬 [RECORDING] Step 1: Hiding ${allElementGuids.length} linked elements`)
      } else {
        console.log(`🎬 [4D Simulation] Step 1: Hiding ${allElementGuids.length} linked elements`)
      }
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

    // CRITICAL: Process each task to determine which elements should be visible
    // Only elements whose tasks have started will be shown
    linksByTask.forEach((taskLinks, taskId) => {
      const firstLink = taskLinks[0]
      const task = firstLink.task
      
      // Prioritize link-specific dates, fall back to task dates
      const plannedStart = firstLink.startDate ? parseISO(firstLink.startDate) : parseISO(task.startDate)
      const plannedEnd = firstLink.endDate ? parseISO(firstLink.endDate) : parseISO(task.endDate)
      const actualStart = task.actualStartDate ? parseISO(task.actualStartDate) : null
      const actualEnd = task.actualEndDate ? parseISO(task.actualEndDate) : null
      const isTaskCritical = criticalPathTasks.has(task.id) && showCriticalPath

      console.log(`📋 [Task ${task.id}] "${task.name}":`, {
        plannedStart: formatDate(plannedStart),
        plannedEnd: formatDate(plannedEnd),
        currentDate: formatDate(currentDate),
        elementCount: taskLinks.length,
        progress: task.progress
      })

      if (mode === 'planned') {
        // Calculate TIMELINE-BASED progress (how much should be done by currentDate)
        const taskDuration = Math.max(1, (plannedEnd.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24))
        const daysPassed = (currentDate.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24)
        
        // Timeline progress: 0% before start, 0-100% during task, 100% after end
        let timelineProgress = 0
        if (isBefore(currentDate, plannedStart)) {
          timelineProgress = 0 // Task hasn't started yet - NO ELEMENTS VISIBLE
        } else if (isAfter(currentDate, plannedEnd)) {
          timelineProgress = 100 // Task should be complete - ALL ELEMENTS VISIBLE
        } else {
          timelineProgress = Math.min(100, Math.max(0, (daysPassed / taskDuration) * 100))
        }
        
        // CRITICAL: Only show elements if timeline progress > 0
        // This ensures Day 1 (before any task starts) shows empty model
        if (timelineProgress === 0) {
          // Before task start date - NO elements visible (skip this task)
          if (isRecording) {
            console.log(`🎬 [RECORDING] Task "${task.name}" not started yet (starts ${formatDate(plannedStart)})`)
          }
          return // Skip to next task
        }
        
        // Determine visibility and color based on timeline position
        let shouldShowElements = false
        let taskColor = STATUS_COLORS.PLANNED.NOT_STARTED
        const actualProgress = Number(task.progress || 0)
        
        // Check if we're on the final day of the project
        const isOnFinalDay = !isBefore(currentDate, projectTimeframe.end) && 
                            !isAfter(currentDate, addDays(projectTimeframe.end, 1))
        
        if (timelineProgress > 0 && timelineProgress < 100) {
          // During task - show elements progressively based on timeline
          shouldShowElements = true
          
          // REFINED COLOR SYSTEM: Color based on actual progress percentage
          // 0% = Gray, 1-33% = Yellow, 34-66% = Orange, 67-99% = Cyan, 100% = Green
          taskColor = getProgressColor(actualProgress, 'planned', isTaskCritical)
          
          // Track as active task
          if (!taskElementMap.has(task.id)) {
            taskElementMap.set(task.id, [])
            currentActiveTasks.push(task)
          }
        } else if (timelineProgress >= 100) {
          // After task end date - show all elements
          shouldShowElements = true
          
          // On final day with 100% completion, use realistic materials (no color override)
          if (isOnFinalDay && actualProgress >= 100) {
            taskColor = null // null - use original materials
          } else {
            // Otherwise use progress-based colors
            taskColor = getProgressColor(actualProgress, 'planned', isTaskCritical)
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
            
            if (isRecording && elementsToShow > 0) {
              console.log(`🎬 [RECORDING] Task "${task.name}": Showing ${elementsToShow}/${totalElements} elements (${timelineProgress.toFixed(1)}% timeline)`)
            }
            
            sortedLinks.forEach((link, index) => {
              if (index < elementsToShow) {
                visibleGuids.push(link.element.guid)
                
                // Only apply color filter if not using realistic materials
                if (taskColor !== null) {
                  colorFilters.push({ 
                    property: { key: 'id', value: link.element.guid }, 
                    color: taskColor 
                  })
                }
                
                if (taskElementMap.has(task.id)) {
                  taskElementMap.get(task.id)!.push(link.element.guid)
                }
              }
              // Elements not yet reached by timeline stay HIDDEN (not added to visibleGuids)
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
          timelineProgress = 0 // Task hasn't started yet - NO ELEMENTS VISIBLE
        } else if (isAfter(currentDate, endDate)) {
          timelineProgress = 100 // Task complete - ALL ELEMENTS VISIBLE
        } else {
          timelineProgress = Math.min(100, Math.max(0, (daysPassed / taskDuration) * 100))
        }
        
        // CRITICAL: Only show elements if timeline progress > 0
        // This ensures Day 1 (before any task starts) shows empty model
        if (timelineProgress === 0) {
          // Before task start date - NO elements visible (skip this task)
          if (isRecording) {
            console.log(`🎬 [RECORDING] Task "${task.name}" not started yet (starts ${formatDate(startDate)})`)
          }
          return // Skip to next task
        }
        
        const actualProgress = Number(task.progress || 0)
        let shouldShowElements = false
        let taskColor = STATUS_COLORS.ACTUAL.NOT_STARTED
        
        if (timelineProgress > 0 && timelineProgress < 100) {
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
        } else if (timelineProgress >= 100) {
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
            
            if (isRecording && elementsToShow > 0) {
              console.log(`🎬 [RECORDING] Task "${task.name}": Showing ${elementsToShow}/${totalElements} elements (${timelineProgress.toFixed(1)}% timeline)`)
            }
            
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
      if (isRecording) {
        console.log(`🎬 [RECORDING] Showing ${visibleGuids.length} elements at ${formatDate(currentDate)}`)
      } else {
        console.log(`🎬 [4D Simulation] Showing ${visibleGuids.length} elements at ${formatDate(currentDate)}`)
      }
    } else {
      if (isRecording) {
        console.log(`🎬 [RECORDING] No elements visible at ${formatDate(currentDate)} (before construction start)`)
      } else {
        console.log(`🎬 [4D Simulation] No elements visible at ${formatDate(currentDate)} (before construction start)`)
      }
    }
    
    // For opacity and gradient modes, we still only show elements that have started
    // (they're already in visibleGuids from the processing above)

    // Apply color filters to visible elements
    if (colorFilters.length > 0) {
      console.log(`🎨 [4D Simulation] Applying ${colorFilters.length} color filters`)
      console.log(`🎨 [4D Simulation] Sample colors:`, colorFilters.slice(0, 3).map(f => ({ guid: f.property.value, color: f.color })))
      viewerRef.current.setColorFilter({
        property: 'id',
        multiple: colorFilters,
        default_color: STATUS_COLORS.PLANNED.NOT_STARTED,
      })
    } else {
      console.log(`🎨 [4D Simulation] No color filters to apply (final day with realistic materials)`)
    }

  }, [currentDate, links, mode, criticalPathTasks, showCriticalPath, visualizationMode, isRecording])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDate(prevDate => {
          let nextDay = addDays(prevDate, 1)
          
          // SMART SKIP: Skip days with no task activity (optional)
          if (skipEmptyDays && isRecording) {
            // Find next day with task activity
            let daysToSkip = 0
            const maxSkip = 30 // Maximum days to skip at once
            
            while (daysToSkip < maxSkip && isBefore(nextDay, projectTimeframe.end)) {
              // Check if any task is active on this day
              const hasActivity = tasks.some(task => {
                const taskStart = parseISO(task.startDate)
                const taskEnd = parseISO(task.endDate)
                return !isBefore(nextDay, taskStart) && !isAfter(nextDay, taskEnd)
              })
              
              if (hasActivity) {
                break // Found a day with activity
              }
              
              // Skip this day
              nextDay = addDays(nextDay, 1)
              daysToSkip++
            }
            
            if (daysToSkip > 0 && isRecording) {
              console.log(`⏭️ [SMART SKIP] Skipped ${daysToSkip} empty days`)
            }
          }
          
          if (isAfter(nextDay, projectTimeframe.end)) {
            setIsPlaying(false)
            
            // Auto-stop recording when simulation ends
            if (isRecording && videoRecorderRef.current) {
              console.log('🎬 [AUTO-RECORD] Simulation reached end date, stopping recording')
              console.log('🎬 [AUTO-RECORD] Captured full animation from start to finish')
              setTimeout(() => {
                videoRecorderRef.current?.stop()
                toast.success('🎬 Animation recording completed! Full 3D model build captured. Video will download shortly...', { duration: 5000 })
              }, 1500) // Increased delay to capture final frames properly
            }
            
            return projectTimeframe.end
          }
          return nextDay
        })
      }, 1000 / playbackSpeed) // Adjust interval based on playback speed
    }
    return () => clearInterval(interval)
  }, [isPlaying, projectTimeframe.end, playbackSpeed, isRecording, skipEmptyDays, tasks])

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
      
      // CRITICAL FIX: Calculate timeline-based progress instead of task completion
      // This shows how much of the timeline has elapsed, not how many tasks are done
      const totalDays = Math.max(1, (projectTimeframe.end.getTime() - projectTimeframe.start.getTime()) / (1000 * 60 * 60 * 24))
      const daysPassed = (currentDate.getTime() - projectTimeframe.start.getTime()) / (1000 * 60 * 60 * 24)
      const timelineProgress = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)))
      
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
        progress: `${timelineProgress}%`, // Timeline-based progress
        taskName: currentTask,
        completedTasks: `${completedTasks} / ${totalTasks}`,
        totalCost: formattedCost,
      })
    }
  }, [currentDate, activeTasks, tasks, isRecording, includeOverlay, project.name, totalProjectCost, projectTimeframe.start, projectTimeframe.end])

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
    if (recordingMode === 'current-view') {
      startRecordingCurrentView()
    } else {
      startRecordingSimulationPlayback()
    }
  }

  const startRecordingCurrentView = () => {
    if (!videoRecorderRef.current || !viewerCanvasRef.current) {
      toast.error('Video recorder or canvas not ready.')
      return
    }

    toast.info('Recording current view for 5 seconds...', { duration: 3000 })
    
    try {
      // Reinitialize recorder
      videoRecorderRef.current.dispose()
      videoRecorderRef.current = new VideoRecorder(viewerCanvasRef.current, {
        format: recordingFormat,
        quality: recordingQuality,
        fps: 60,
        includeOverlay,
        overlayData: {
          projectName: project.name,
          date: formatDate(currentDate),
          progress: `${Math.round((activeTasks.filter(t => t.progress >= 100).length / tasks.length) * 100)}%`,
          taskName: activeTasks.length > 0 ? activeTasks[0].name : 'No active tasks',
          completedTasks: `${activeTasks.filter(t => t.progress >= 100).length} / ${tasks.length}`,
          totalCost: `₹${totalProjectCost.toLocaleString('en-IN')}`,
        }
      })

      setIsRecording(true)
      
      videoRecorderRef.current.start((blob: Blob, format: string) => {
        setIsRecording(false)
        const extension = format === 'mp4' ? 'mp4' : 'webm'
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm'
        const fileSize = (blob.size / 1024 / 1024).toFixed(2)
        const fileName = `4D_CurrentView_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${formatDate(currentDate).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${extension}`
        downloadFile(blob, fileName, mimeType)
        toast.success(`✅ Current view recorded! Size: ${fileSize} MB`, { duration: 5000 })
      }).catch((error: Error) => {
        setIsRecording(false)
        toast.error(`Failed to start recording: ${error.message}`)
      })

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (videoRecorderRef.current?.isRecording()) {
          videoRecorderRef.current.stop()
        }
      }, 5000)
      
    } catch (error) {
      console.error('Failed to record current view:', error)
      toast.error(`Failed to record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startRecordingSimulationPlayback = () => {
    if (!videoRecorderRef.current) {
      toast.error('Video recorder not initialized.')
      return
    }

    if (!viewerCanvasRef.current) {
      toast.error('3D viewer canvas not ready. Please wait for model to load.')
      return
    }

    // CRITICAL: Stop any playback first
    setIsPlaying(false)
    
    const totalDays = Math.ceil((projectTimeframe.end.getTime() - projectTimeframe.start.getTime()) / (1000 * 60 * 60 * 24))
    const estimatedDuration = Math.ceil(totalDays / playbackSpeed)
    const qualityText = recordingQuality === 'fullhd' ? 'Full HD (1920x1080)' : recordingQuality === '4k' ? '4K (3840x2160)' : 'HD (1280x720)'
    
    console.log('🎬 [AUTO-RECORD] Starting full simulation recording')
    console.log(`🎬 [AUTO-RECORD] Timeline: ${formatDate(projectTimeframe.start)} to ${formatDate(projectTimeframe.end)} (${totalDays} days)`)
    console.log(`🎬 [AUTO-RECORD] Estimated duration: ${estimatedDuration} seconds at ${playbackSpeed}x speed`)
    console.log(`🎬 [AUTO-RECORD] Quality: ${qualityText} ${recordingFormat.toUpperCase()}`)
    console.log(`🎬 [AUTO-RECORD] Canvas dimensions: ${viewerCanvasRef.current.width}x${viewerCanvasRef.current.height}`)
    
    toast.info('Preparing recording... Resetting simulation to start', { duration: 3000 })
    
    // STEP 1: Reset to start date FIRST
    setCurrentDate(projectTimeframe.start)
    
    // STEP 2: Wait for React state update and viewer to process the date change
    setTimeout(() => {
      console.log('🎬 [AUTO-RECORD] Date reset complete, hiding all elements')
      toast.info('Hiding all elements...', { duration: 2000 })
      
      // STEP 3: Force hide ALL elements to ensure clean start
      if (viewerRef.current) {
        try {
          const allElementGuids = links.map(link => link.element.guid)
          viewerRef.current.hideObjects([])
          if (allElementGuids.length > 0) {
            viewerRef.current.hideObjects(allElementGuids)
          }
          console.log(`🎬 [AUTO-RECORD] All ${allElementGuids.length} elements hidden`)
        } catch (e) {
          console.warn('Could not hide all elements:', e)
        }
      }
      
      // STEP 4: Wait for viewer to fully render the empty state
      setTimeout(() => {
        console.log('🎬 [AUTO-RECORD] Initializing video recorder')
        toast.info('Initializing video recorder...', { duration: 2000 })
        
        // STEP 5: Reinitialize recorder with fresh settings
        try {
          videoRecorderRef.current!.dispose()
          if (viewerCanvasRef.current) {
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
                completedTasks: `0 / ${tasks.length}`,
                totalCost: '₹0',
              }
            })
          }
        } catch (error) {
          console.error('Failed to initialize recorder:', error)
          toast.error(`Failed to initialize recorder: ${error instanceof Error ? error.message : 'Unknown error'}`)
          return
        }
        
        // STEP 6: Start recording
        console.log('🎬 [AUTO-RECORD] Starting video capture')
        setIsRecording(true)
        
        videoRecorderRef.current!.start((blob: Blob, format: string) => {
          console.log('🎬 [AUTO-RECORD] Recording completed, preparing download')
          setIsRecording(false)
          setIsPlaying(false)
          const extension = format === 'mp4' ? 'mp4' : 'webm'
          const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm'
          const fileSize = (blob.size / 1024 / 1024).toFixed(2)
          const fileName = `4D_Simulation_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${totalDays}days_${recordingQuality}_${Date.now()}.${extension}`
          downloadFile(blob, fileName, mimeType)
          toast.success(`✅ Full simulation recorded! ${totalDays} days in ${estimatedDuration}s | Size: ${fileSize} MB | Quality: ${recordingQuality.toUpperCase()} ${format.toUpperCase()}`, { duration: 10000 })
        }).catch((error: Error) => {
          console.error('Failed to start recording:', error)
          setIsRecording(false)
          toast.error(`Failed to start recording: ${error.message}`, { duration: 8000 })
        })
        
        // STEP 7: Wait for recorder to start capturing frames
        setTimeout(() => {
          console.log('🎬 [AUTO-RECORD] Starting playback - animation will be recorded frame-by-frame')
          console.log('🎬 [AUTO-RECORD] Recording LIVE 3D model animation as it builds step-by-step')
          setIsPlaying(true)
          
          toast.success(`🎬 Recording ${totalDays} days of LIVE 3D animation in ${qualityText} ${recordingFormat.toUpperCase()}. Model will build progressively. Time: ~${estimatedDuration}s at ${playbackSpeed}x speed.`, { duration: 8000 })
        }, 1500) // Increased delay to ensure recorder is fully ready
      }, 700)
    }, 1000)
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
                  {/* Recording Mode Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Recording Mode</label>
                    <select
                      value={recordingMode}
                      onChange={(e) => setRecordingMode(e.target.value as 'current-view' | 'simulation-playback')}
                      className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                    >
                      <option value="current-view">📸 Record Current View (5 sec static)</option>
                      <option value="simulation-playback">🎬 Record Full Animation (Step-by-step build)</option>
                    </select>
                    <p className="text-[10px] text-gray-500 italic">
                      {recordingMode === 'current-view' 
                        ? 'Records current date view for 5 seconds' 
                        : 'Records LIVE 3D animation - model builds progressively from empty to complete'}
                    </p>
                  </div>
                  
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

                  {/* Smart Skip Toggle - NEW */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-700">Smart Skip Empty Days</label>
                      <p className="text-[10px] text-gray-500">Skip days with no construction activity</p>
                    </div>
                    <button
                      onClick={() => setSkipEmptyDays(!skipEmptyDays)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        skipEmptyDays ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          skipEmptyDays ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {includeOverlay && (
                    <div className="text-xs text-gray-500 italic">
                      Video will include project name, date, progress, and watermark
                    </div>
                  )}
                  
                  {skipEmptyDays && (
                    <div className="text-xs text-green-600 italic">
                      ⚡ 511 days → ~50-100 days (skips empty periods)
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {isRecording && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-red-700 font-semibold">
                      <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="text-sm">Recording LIVE 3D Animation</span>
                    </div>
                    <div className="text-xs text-red-600">
                      {Math.ceil((projectTimeframe.end.getTime() - projectTimeframe.start.getTime()) / (1000 * 60 * 60 * 24))} days timeline • 
                      {recordingQuality === 'fullhd' ? ' Full HD' : recordingQuality === '4k' ? ' 4K' : ' HD'} {recordingFormat.toUpperCase()} • 
                      {playbackSpeed}x speed
                    </div>
                    <div className="text-xs text-gray-600">
                      Model building step-by-step • Will auto-stop at {formatDate(projectTimeframe.end)}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={takeScreenshot} size="sm" disabled={isRecording || !viewerCanvasRef.current}>
                    <Camera className="h-4 w-4 mr-1" />
                    Screenshot
                  </Button>
                  {!isRecording ? (
                    <>
                      <Button onClick={startRecording} size="sm" disabled={!viewerCanvasRef.current} className="bg-red-600 hover:bg-red-700">
                        <Video className="h-4 w-4 mr-1" />
                        {recordingMode === 'current-view' ? 'Record View' : 'Auto-Record'}
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