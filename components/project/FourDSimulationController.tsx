'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Calendar,
  Layers
} from 'lucide-react'
import { format, addDays, differenceInDays } from 'date-fns'

interface FourDSimulationControllerProps {
  tasks: any[]
  onTimeChange: (date: Date, activeTasks: any[]) => void
  onElementColorUpdate: (elementColors: Map<string, string>) => void
}

export default function FourDSimulationController({
  tasks,
  onTimeChange,
  onElementColorUpdate
}: FourDSimulationControllerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1) // days per second
  const animationRef = useRef<number>()
  const lastUpdateRef = useRef<number>(Date.now())

  // Calculate date range from tasks
  useEffect(() => {
    if (tasks.length === 0) return

    const dates = tasks
      .flatMap(task => [task.startDate, task.endDate])
      .filter(Boolean)
      .map(d => new Date(d))

    if (dates.length === 0) return

    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))

    setDateRange({ start, end })
    setCurrentDate(start)
  }, [tasks])

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !currentDate || !dateRange) return

    const animate = () => {
      const now = Date.now()
      const deltaTime = (now - lastUpdateRef.current) / 1000 // seconds
      lastUpdateRef.current = now

      const daysToAdd = deltaTime * playbackSpeed
      const newDate = addDays(currentDate, daysToAdd)

      if (newDate >= dateRange.end) {
        setCurrentDate(dateRange.end)
        setIsPlaying(false)
      } else {
        setCurrentDate(newDate)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, currentDate, dateRange, playbackSpeed])

  // Update element colors based on current date
  useEffect(() => {
    if (!currentDate) return

    const activeTasks = tasks.filter(task => {
      if (!task.startDate || !task.endDate) return false
      const start = new Date(task.startDate)
      const end = new Date(task.endDate)
      return currentDate >= start && currentDate <= end
    })

    const elementColors = new Map<string, string>()

    tasks.forEach(task => {
      if (!task.startDate || !task.endDate || !task.elementLinks) return

      const start = new Date(task.startDate)
      const end = new Date(task.endDate)

      let color = '#9CA3AF' // Grey - not started

      if (currentDate >= start && currentDate <= end) {
        // In progress - calculate progress
        const totalDays = differenceInDays(end, start)
        const elapsedDays = differenceInDays(currentDate, start)
        const progress = totalDays > 0 ? elapsedDays / totalDays : 0

        if (progress < 0.3) {
          color = '#FCD34D' // Yellow - early progress
        } else if (progress < 0.7) {
          color = '#F59E0B' // Orange - mid progress
        } else {
          color = '#10B981' // Green - near completion
        }
      } else if (currentDate > end) {
        color = '#10B981' // Green - completed
      }

      task.elementLinks.forEach((link: any) => {
        if (link.element?.guid) {
          elementColors.set(link.element.guid, color)
        }
      })
    })

    onElementColorUpdate(elementColors)
    onTimeChange(currentDate, activeTasks)
  }, [currentDate, tasks, onTimeChange, onElementColorUpdate])

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      lastUpdateRef.current = Date.now()
      setIsPlaying(true)
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    if (dateRange) {
      setCurrentDate(dateRange.start)
    }
  }

  const handleSkipForward = () => {
    if (!currentDate || !dateRange) return
    const newDate = addDays(currentDate, 7)
    setCurrentDate(newDate > dateRange.end ? dateRange.end : newDate)
  }

  const handleSkipBack = () => {
    if (!currentDate || !dateRange) return
    const newDate = addDays(currentDate, -7)
    setCurrentDate(newDate < dateRange.start ? dateRange.start : newDate)
  }

  const handleSliderChange = (value: number[]) => {
    if (!dateRange) return
    const totalDays = differenceInDays(dateRange.end, dateRange.start)
    const targetDay = Math.floor((value[0] / 100) * totalDays)
    setCurrentDate(addDays(dateRange.start, targetDay))
    setIsPlaying(false)
  }

  const getSliderValue = () => {
    if (!currentDate || !dateRange) return 0
    const totalDays = differenceInDays(dateRange.end, dateRange.start)
    const currentDay = differenceInDays(currentDate, dateRange.start)
    return totalDays > 0 ? (currentDay / totalDays) * 100 : 0
  }

  const activeTasks = currentDate
    ? tasks.filter(task => {
        if (!task.startDate || !task.endDate) return false
        const start = new Date(task.startDate)
        const end = new Date(task.endDate)
        return currentDate >= start && currentDate <= end
      })
    : []

  if (!dateRange) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No tasks with dates available for simulation</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-sm">
          <Play className="h-4 w-4 mr-2" />
          4D Build Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Date Display */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Current Date</div>
          <div className="text-2xl font-bold text-gray-900">
            {currentDate ? format(currentDate, 'MMM dd, yyyy') : '-'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {dateRange && currentDate && (
              <>
                Day {differenceInDays(currentDate, dateRange.start) + 1} of{' '}
                {differenceInDays(dateRange.end, dateRange.start) + 1}
              </>
            )}
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="space-y-2">
          <Slider
            value={[getSliderValue()]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{format(dateRange.start, 'MMM dd, yyyy')}</span>
            <span>{format(dateRange.end, 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSkipBack}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            onClick={handlePlayPause}
            className="px-8"
          >
            {isPlaying ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Play
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSkipForward}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Playback Speed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Playback Speed</span>
            <Badge variant="secondary">{playbackSpeed}x</Badge>
          </div>
          <Slider
            value={[playbackSpeed]}
            onValueChange={(value) => setPlaybackSpeed(value[0])}
            min={0.5}
            max={10}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Active Tasks */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Layers className="h-3 w-3" />
            <span>Active Tasks: {activeTasks.length}</span>
          </div>
          {activeTasks.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {activeTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="text-xs p-2 bg-yellow-50 border border-yellow-200 rounded"
                >
                  <div className="font-medium truncate">{task.name}</div>
                  <div className="text-gray-600">
                    {task.elementLinks?.length || 0} elements
                  </div>
                </div>
              ))}
              {activeTasks.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  +{activeTasks.length - 5} more tasks
                </p>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-semibold text-gray-600">Color Legend</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-400" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-400" />
              <span>Mid Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>Completed</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
