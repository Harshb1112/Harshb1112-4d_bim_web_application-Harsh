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
}: SimulationControlProps) {
  const totalDays = differenceInDays(projectEndDate, projectStartDate)
  const currentDay = differenceInDays(currentDate, projectStartDate)

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

        <div className="text-center">
          <p className="text-sm text-gray-500">Current Date</p>
          <p className="text-lg font-semibold text-gray-900">{formatDate(currentDate)}</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatDate(projectStartDate)}</span>
            <span>{formatDate(projectEndDate)}</span>
          </div>
          <Slider
            value={[currentDay]}
            onValueChange={handleSliderChange}
            max={totalDays > 0 ? totalDays : 1}
            step={1}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}