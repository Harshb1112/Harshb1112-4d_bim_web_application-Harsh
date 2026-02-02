/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Play, Pause, RotateCcw, Calendar, CheckCircle } from 'lucide-react'
import { differenceInDays, addDays } from 'date-fns'

import { Switch } from '@/components/ui/switch'

interface SimulationControlProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  projectStartDate: Date
  projectEndDate: Date
  mode: 'planned' | 'actual'
  setMode: (mode: 'planned' | 'actual') => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  milestones?: Array<{ id: number; name: string; date: Date }>
}

export default function SimulationControl({
  currentDate,
  setCurrentDate,
  isPlaying,
  setIsPlaying,
  projectStartDate,
  projectEndDate,
  mode,
  setMode,
  playbackSpeed,
  setPlaybackSpeed,
  milestones = [],
}: SimulationControlProps) {
  const totalDays = differenceInDays(projectEndDate, projectStartDate)
  const currentDay = differenceInDays(currentDate, projectStartDate)
  const progressPercentage = totalDays > 0 ? (currentDay / totalDays) * 100 : 0

  const handleSliderChange = (value: number[]) => {
    const newDate = addDays(projectStartDate, value[0])
    setCurrentDate(newDate)
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentDate(projectStartDate)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Play className="h-5 w-5" />
          <span>Simulation Controls</span>
        </CardTitle>
        <CardDescription>Control the 4D animation playback</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button onClick={handlePlayPause} className="w-24">
            {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Label htmlFor="mode-switch">Planned</Label>
          </div>
          <Switch
            id="mode-switch"
            checked={mode === 'actual'}
            onCheckedChange={(checked: any) => setMode(checked ? 'actual' : 'planned')}
          />
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-gray-500" />
            <Label htmlFor="mode-switch">Actual</Label>
          </div>
        </div>

        <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Current Simulation Date</p>
          <p className="text-2xl font-bold text-gray-900">{formatDate(currentDate)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatTime(currentDate)}</p>
          <div className="mt-2 flex items-center justify-center space-x-2 text-xs text-gray-600">
            <span>Day {currentDay + 1} of {totalDays + 1}</span>
            <span>•</span>
            <span>{progressPercentage.toFixed(1)}% Complete</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-gray-600">Timeline</Label>
            <span className="text-xs text-gray-500">{totalDays + 1} days</span>
          </div>
          <div className="space-y-2">
            <Slider
              value={[currentDay]}
              onValueChange={handleSliderChange}
              max={totalDays > 0 ? totalDays : 1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatDate(projectStartDate)}</span>
              <span>{formatDate(projectEndDate)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-gray-600">Playback Speed</Label>
            <span className="text-xs font-semibold text-gray-900">{playbackSpeed}x</span>
          </div>
          <Slider
            value={[playbackSpeed]}
            onValueChange={(value) => setPlaybackSpeed(value[0])}
            min={0.5}
            max={20}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.5x (Slow)</span>
            <span>20x (Very Fast)</span>
          </div>
        </div>

        {milestones.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Milestones</Label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {milestones.slice(0, 5).map((milestone) => (
                <button
                  key={milestone.id}
                  onClick={() => setCurrentDate(milestone.date)}
                  className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                >
                  <div className="font-medium text-gray-900 truncate">{milestone.name}</div>
                  <div className="text-gray-500">{formatDate(milestone.date)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}