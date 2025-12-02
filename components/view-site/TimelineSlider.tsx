'use client'

import { useMemo } from 'react'
import { format, parseISO, differenceInDays, addDays } from 'date-fns'

interface TimelineSliderProps {
  captures: any[]
  currentCapture: any
  onCaptureSelect: (capture: any) => void
  projectStartDate: string | null
  projectEndDate: string | null
}

export default function TimelineSlider({
  captures,
  currentCapture,
  onCaptureSelect,
  projectStartDate,
  projectEndDate
}: TimelineSliderProps) {
  const timelineData = useMemo(() => {
    if (!projectStartDate || !projectEndDate) {
      return { days: [], startDate: new Date(), totalDays: 30 }
    }

    const start = parseISO(projectStartDate)
    const end = parseISO(projectEndDate)
    const totalDays = Math.max(differenceInDays(end, start), 1)

    // Group captures by date
    const capturesByDate: Record<string, any[]> = {}
    captures.forEach(capture => {
      const dateKey = capture.capturedAt.split('T')[0]
      if (!capturesByDate[dateKey]) {
        capturesByDate[dateKey] = []
      }
      capturesByDate[dateKey].push(capture)
    })

    // Create day markers
    const days = []
    for (let i = 0; i <= totalDays; i++) {
      const date = addDays(start, i)
      const dateKey = format(date, 'yyyy-MM-dd')
      days.push({
        date,
        dateKey,
        hasCaptures: !!capturesByDate[dateKey],
        captureCount: capturesByDate[dateKey]?.length || 0,
        captures: capturesByDate[dateKey] || []
      })
    }

    return { days, startDate: start, totalDays }
  }, [captures, projectStartDate, projectEndDate])

  const currentIndex = useMemo(() => {
    if (!currentCapture) return -1
    return captures.findIndex(c => c.id === currentCapture.id)
  }, [captures, currentCapture])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value)
    if (captures[index]) {
      onCaptureSelect(captures[index])
    }
  }

  const handleDayClick = (day: any) => {
    if (day.captures.length > 0) {
      onCaptureSelect(day.captures[0])
    }
  }

  return (
    <div className="w-full">
      {/* Main Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={Math.max(captures.length - 1, 0)}
          value={currentIndex >= 0 ? currentIndex : 0}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
              captures.length > 0 ? (currentIndex / (captures.length - 1)) * 100 : 0
            }%, #374151 ${
              captures.length > 0 ? (currentIndex / (captures.length - 1)) * 100 : 0
            }%, #374151 100%)`
          }}
        />
      </div>

      {/* Date Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>
          {projectStartDate ? format(parseISO(projectStartDate), 'MMM d, yyyy') : 'Start'}
        </span>
        {currentCapture && (
          <span className="text-blue-400 font-medium">
            {format(parseISO(currentCapture.capturedAt), 'MMM d, yyyy HH:mm')}
          </span>
        )}
        <span>
          {projectEndDate ? format(parseISO(projectEndDate), 'MMM d, yyyy') : 'End'}
        </span>
      </div>

      {/* Day Markers (mini timeline) */}
      <div className="mt-3 relative h-6 bg-gray-800 rounded overflow-hidden">
        <div className="absolute inset-0 flex">
          {timelineData.days.slice(0, 60).map((day, index) => (
            <div
              key={day.dateKey}
              className={`flex-1 border-r border-gray-700 cursor-pointer transition-colors ${
                day.hasCaptures 
                  ? 'bg-blue-600/50 hover:bg-blue-600/70' 
                  : 'hover:bg-gray-700'
              } ${
                currentCapture && 
                currentCapture.capturedAt.startsWith(day.dateKey) 
                  ? 'bg-blue-500' 
                  : ''
              }`}
              onClick={() => handleDayClick(day)}
              title={`${format(day.date, 'MMM d')} - ${day.captureCount} captures`}
            >
              {day.captureCount > 0 && (
                <div className="w-full h-full flex items-end justify-center">
                  <div 
                    className="w-1 bg-blue-400 rounded-t"
                    style={{ height: `${Math.min(day.captureCount * 20, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Capture Thumbnails */}
      {captures.length > 0 && (
        <div className="mt-3 flex gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600">
          {captures.slice(0, 20).map((capture, index) => (
            <button
              key={capture.id}
              onClick={() => onCaptureSelect(capture)}
              className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                currentCapture?.id === capture.id 
                  ? 'border-blue-500 ring-2 ring-blue-500/50' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              {capture.thumbnailUrl ? (
                <img 
                  src={capture.thumbnailUrl} 
                  alt={`Capture ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-xs text-gray-400">
                    {format(parseISO(capture.capturedAt), 'HH:mm')}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .slider-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  )
}
