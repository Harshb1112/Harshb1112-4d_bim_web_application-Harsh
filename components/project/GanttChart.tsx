/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useState } from 'react'
import { Timeline } from 'vis-timeline'
import { DataSet } from 'vis-data'
import 'vis-timeline/styles/vis-timeline-graph2d.css'

interface GanttChartProps {
  tasks: any[]
  criticalPathTasks?: Set<number>
  onTaskClick?: (task: any) => void
}

// Professional color palette for timeline
const TASK_COLORS = [
  { bg: '#8B5CF6', border: '#7C3AED', text: '#ffffff' }, // Purple
  { bg: '#06B6D4', border: '#0891B2', text: '#ffffff' }, // Cyan
  { bg: '#10B981', border: '#059669', text: '#ffffff' }, // Green
  { bg: '#F59E0B', border: '#D97706', text: '#ffffff' }, // Amber
  { bg: '#EF4444', border: '#DC2626', text: '#ffffff' }, // Red
  { bg: '#EC4899', border: '#DB2777', text: '#ffffff' }, // Pink
  { bg: '#3B82F6', border: '#2563EB', text: '#ffffff' }, // Blue
  { bg: '#84CC16', border: '#65A30D', text: '#ffffff' }, // Lime
]

export default function GanttChart({ tasks, criticalPathTasks, onTaskClick }: GanttChartProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timeline = useRef<Timeline | null>(null)

  useEffect(() => {
    if (!timelineRef.current) {
      console.log('[GanttChart] No container ref')
      return
    }
    
    if (!tasks.length) {
      console.log('[GanttChart] No tasks to display')
      return
    }
    
    console.log('[GanttChart] ===== RENDERING GANTT CHART =====')
    console.log('[GanttChart] Total tasks:', tasks.length)
    console.log('[GanttChart] Tasks data:', JSON.stringify(tasks.map(t => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      progress: t.progress
    })), null, 2))
    
    // Check if container has valid dimensions
    const container = timelineRef.current
    console.log('[GanttChart] Container dimensions:', {
      width: container.clientWidth,
      height: container.clientHeight,
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight
    })
    
    if (container.clientWidth <= 0 || container.clientHeight <= 0) {
      console.warn('[GanttChart] ⚠️ Container has invalid dimensions, will retry on next render')
      // Force a re-render after a short delay
      setTimeout(() => {
        if (timelineRef.current) {
          console.log('[GanttChart] Retrying with dimensions:', {
            width: timelineRef.current.clientWidth,
            height: timelineRef.current.clientHeight
          })
        }
      }, 100)
      return
    }

    // Function to get color based on task status and index
    const getTaskColor = (status: string, progress: number, index: number) => {
      if (status === 'completed') {
        return { bg: '#10B981', border: '#059669', text: '#ffffff' }
      }
      const colorIndex = index % TASK_COLORS.length
      return TASK_COLORS[colorIndex]
    }

    // Prepare data for vis-timeline
    const items = new DataSet(
      tasks.map((task, index) => {
        const isCritical = criticalPathTasks?.has(task.id)
        const colors = getTaskColor(task.status || 'todo', task.progress || 0, index)
        
        let itemStyle = `
          background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%);
          border: 2px solid ${colors.border};
          border-radius: 6px;
          color: ${colors.text};
          font-weight: 500;
          padding: 4px 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `

        if (isCritical) {
          itemStyle += `border: 3px solid #EF4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);`
        }

        if (task.progress > 0 && task.progress < 100) {
          itemStyle += `
            background: linear-gradient(to right, ${colors.bg} 0%, ${colors.bg} ${task.progress}%, ${colors.bg}66 ${task.progress}%, ${colors.bg}66 100%);
          `
        }

        const elementCount = task.elementLinks?.length || 0
        const assigneeName = task.assignee?.fullName || 'Unassigned'
        const teamName = task.team?.name || 'No team'

        return {
          id: task.id,
          content: `<div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 600;">${task.name}</span>
            ${elementCount > 0 ? `<span style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 10px; font-size: 11px;">🔗 ${elementCount}</span>` : ''}
          </div>`,
          start: task.startDate ? new Date(task.startDate) : new Date(),
          end: task.endDate ? new Date(task.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          style: itemStyle,
          title: `<div style="padding: 12px; min-width: 200px;">
            <strong style="font-size: 14px;">${task.name}</strong>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="margin: 4px 0;">📊 Progress: <strong>${Number(task.progress || 0).toFixed(0)}%</strong></div>
              <div style="margin: 4px 0;">👤 Assignee: <strong>${assigneeName}</strong></div>
              <div style="margin: 4px 0;">👥 Team: <strong>${teamName}</strong></div>
              <div style="margin: 4px 0;">🔗 Elements: <strong>${elementCount}</strong></div>
              <div style="margin: 4px 0;">📅 Status: <strong style="text-transform: capitalize;">${(task.status || 'todo').replace('_', ' ')}</strong></div>
            </div>
          </div>`
        }
      })
    )

    // Calculate date range from tasks
    const taskDates = tasks.flatMap(t => [
      t.startDate ? new Date(t.startDate) : null,
      t.endDate ? new Date(t.endDate) : null
    ]).filter(Boolean) as Date[]
    
    const minDate = taskDates.length > 0 
      ? new Date(Math.min(...taskDates.map(d => d.getTime())) - 15 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const maxDate = taskDates.length > 0
      ? new Date(Math.max(...taskDates.map(d => d.getTime())) + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

    const options = {
      stack: true,
      start: minDate,
      end: maxDate,
      editable: false,
      selectable: true,
      zoomable: true,
      moveable: true,
      zoomMin: 1000 * 60 * 60 * 24 * 7, // 1 week minimum
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years maximum
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap' as const
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
      margin: { item: { horizontal: 10, vertical: 10 } },
      orientation: { axis: 'both', item: 'top' },
      showCurrentTime: true,
      showMajorLabels: true,
      showMinorLabels: true,
      height: '500px'
    }

    timeline.current = new Timeline(timelineRef.current, items, options)

    if (onTaskClick) {
      timeline.current.on('select', (properties) => {
        if (properties.items && properties.items.length > 0) {
          const taskId = properties.items[0]
          const task = tasks.find(t => t.id === taskId)
          if (task) onTaskClick(task)
        }
      })
    }

    return () => {
      if (timeline.current) timeline.current.destroy()
    }
  }, [tasks, criticalPathTasks, onTaskClick])

  if (!tasks.length) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Tasks Yet</h3>
          <p className="text-gray-600">Create tasks to see them on the timeline</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gantt-wrapper rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: '500px' }}>
      <style jsx global>{`
        .gantt-wrapper { background: #f8fafc; min-height: 500px; }
        .vis-timeline { border: none !important; font-family: system-ui, sans-serif !important; }
        
        /* Top & Bottom axis */
        .vis-panel.vis-top, .vis-panel.vis-bottom {
          background: linear-gradient(180deg, #1e293b 0%, #334155 100%) !important;
          border: none !important;
        }
        
        .vis-time-axis .vis-text {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
        }
        
        .vis-time-axis .vis-text.vis-major {
          color: #94a3b8 !important;
          font-size: 12px !important;
        }
        
        /* Center panel */
        .vis-panel.vis-center { background: #ffffff !important; }
        
        /* Grid */
        .vis-grid.vis-vertical { border-color: #f1f5f9 !important; }
        .vis-grid.vis-minor.vis-vertical { border-color: #f8fafc !important; }
        
        /* Task items */
        .vis-item {
          border-radius: 6px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        
        .vis-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
          z-index: 999 !important;
        }
        
        .vis-item.vis-selected {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        
        /* Current time */
        .vis-current-time {
          background: #EF4444 !important;
          width: 2px !important;
        }
        
        /* Tooltip */
        .vis-tooltip {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
        }
        
        /* Scrollbar */
        .vis-timeline::-webkit-scrollbar { width: 8px; height: 8px; }
        .vis-timeline::-webkit-scrollbar-track { background: #f1f5f9; }
        .vis-timeline::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
      <div ref={timelineRef} className="w-full" style={{ minHeight: '500px', height: '500px' }} />
    </div>
  )
}
