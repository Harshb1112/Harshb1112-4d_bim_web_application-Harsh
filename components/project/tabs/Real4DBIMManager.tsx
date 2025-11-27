/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  Box, 
  Filter, 
  MousePointer, 
  Square, 
  Lasso, 
  Layers,
  PlusCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import SpeckleViewer from '../SpeckleViewer'

interface Real4DBIMManagerProps {
  project: any
}

// Construction phases
const CONSTRUCTION_PHASES = [
  { id: 1, name: 'Site Preparation', color: '#8B4513' },
  { id: 2, name: 'Foundation', color: '#696969' },
  { id: 3, name: 'Structure', color: '#4169E1' },
  { id: 4, name: 'Envelope', color: '#32CD32' },
  { id: 5, name: 'MEP Rough-in', color: '#FF8C00' },
  { id: 6, name: 'Interior Finishes', color: '#9370DB' },
  { id: 7, name: 'Final Completion', color: '#20B2AA' }
]

export default function Real4DBIMManager({ project }: Real4DBIMManagerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(1)
  const [progress, setProgress] = useState(0)
  const [selectionMode, setSelectionMode] = useState<'single' | 'box' | 'lasso'>('single')
  const [selectedElements, setSelectedElements] = useState<string[]>([])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            if (currentPhase < CONSTRUCTION_PHASES.length) {
              setCurrentPhase(p => p + 1)
              return 0
            } else {
              setIsPlaying(false)
              return 100
            }
          }
          return prev + 1
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentPhase])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentPhase(1)
    setProgress(0)
  }

  const handleSkipForward = () => {
    if (currentPhase < CONSTRUCTION_PHASES.length) {
      setCurrentPhase(p => p + 1)
      setProgress(0)
    }
  }

  const handleSkipBack = () => {
    if (currentPhase > 1) {
      setCurrentPhase(p => p - 1)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">4D BIM Manager</h2>
          <p className="text-sm text-gray-500">Manage construction phases and element linking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>3D Model Viewer</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={selectionMode === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectionMode('single')}
                  >
                    <MousePointer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectionMode === 'box' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectionMode('box')}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectionMode === 'lasso' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectionMode('lasso')}
                  >
                    <Lasso className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              <SpeckleViewer project={project} />
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          {/* Phase Control */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Construction Phases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {CONSTRUCTION_PHASES.map((phase) => (
                  <div
                    key={phase.id}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                      currentPhase === phase.id
                        ? 'bg-blue-100 border border-blue-300'
                        : currentPhase > phase.id
                        ? 'bg-green-50'
                        : 'bg-gray-50'
                    }`}
                    onClick={() => {
                      setCurrentPhase(phase.id)
                      setProgress(0)
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: phase.color }}
                      />
                      <span className="text-sm">{phase.name}</span>
                    </div>
                    {currentPhase > phase.id && (
                      <Badge variant="secondary" className="text-xs">Complete</Badge>
                    )}
                    {currentPhase === phase.id && (
                      <Badge className="text-xs">{progress}%</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Playback Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Play className="h-4 w-4 mr-2" />
                Simulation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleSkipBack}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button onClick={handlePlayPause}>
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSkipForward}>
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Slider
                  value={[progress]}
                  onValueChange={(value) => setProgress(value[0])}
                  max={100}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Elements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                Selected Elements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedElements.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No elements selected. Click on elements in the viewer to select them.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {selectedElements.length} element(s) selected
                  </p>
                  <Button className="w-full" size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Link to Current Phase
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
