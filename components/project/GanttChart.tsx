/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef } from 'react'
import { Timeline } from 'vis-timeline'
import { DataSet } from 'vis-data'
import 'vis-timeline/styles/vis-timeline-graph2d.css'

interface GanttChartProps {
  tasks: any[]
  criticalPathTasks?: Set<number>
}

export default function GanttChart({ tasks, criticalPathTasks }: GanttChartProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timeline = useRef<Timeline | null>(null)

  useEffect(() => {
    if (!timelineRef.current || !tasks.length) return

    // Prepare data for vis-timeline
    const items = new DataSet(
      tasks.map(task => {
        const isCritical = criticalPathTasks?.has(task.id)
        let itemClassName = ''
        let itemStyle = task.color ? `background-color: ${task.color}; border-color: ${task.color};` : ''

        if (isCritical) {
          itemClassName += ' vis-item-critical'
          itemStyle += ' border-width: 2px; border-style: solid; box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);'
        }

        return {
          id: task.id,
          content: task.name,
          start: task.startDate ? new Date(task.startDate) : new Date(),
          end: task.endDate ? new Date(task.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          style: itemStyle,
          className: itemClassName,
          title: `${task.name}<br/>Progress: ${Number(task.progress).toFixed(1)}%<br/>Resource: ${task.resource || 'Not assigned'}`
        }
      })
    )

    const options = {
      stack: false,
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),   // 90 days from now
      editable: false,
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap'
      },
      format: {
        minorLabels: {
          millisecond:'SSS',
          second:     's',
          minute:     'HH:mm',
          hour:       'HH:mm',
          weekday:    'ddd D',
          day:        'D',
          week:       'w',
          month:      'MMM',
          year:       'YYYY'
        },
        majorLabels: {
          millisecond:'HH:mm:ss',
          second:     'D MMMM HH:mm',
          minute:     'ddd D MMMM',
          hour:       'ddd D MMMM',
          weekday:    'MMMM YYYY',
          day:        'MMMM YYYY',
          week:       'MMMM YYYY',
          month:      'YYYY',
          year:       ''
        }
      },
      margin: {
        item: {
          horizontal: 10,
          vertical: 5
        }
      },
      orientation: 'top'
    }

    // Create timeline
    timeline.current = new Timeline(timelineRef.current, items)

    // Cleanup
    return () => {
      if (timeline.current) {
        timeline.current.destroy()
      }
    }
  }, [tasks, criticalPathTasks])

  if (!tasks.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No tasks to display</p>
          <p className="text-sm text-gray-400">Create some tasks to see the Gantt chart</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={timelineRef} 
      className="w-full h-64 border rounded-lg"
    />
  )
}