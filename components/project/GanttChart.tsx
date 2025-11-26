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
  onTaskClick?: (task: any) => void
}

export default function GanttChart({ tasks, criticalPathTasks, onTaskClick }: GanttChartProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timeline = useRef<Timeline | null>(null)

  useEffect(() => {
    if (!timelineRef.current || !tasks.length) return

    // Function to get color based on task status
    const getTaskColor = (status: string, progress: number) => {
      switch (status) {
        case 'completed':
          return {
            bg: '#10B981', // Green
            border: '#059669',
            text: '#ffffff'
          }
        case 'in_progress':
          if (progress < 30) {
            return {
              bg: '#FCD34D', // Yellow
              border: '#F59E0B',
              text: '#1F2937'
            }
          } else if (progress < 70) {
            return {
              bg: '#F59E0B', // Orange
              border: '#D97706',
              text: '#ffffff'
            }
          } else {
            return {
              bg: '#86EFAC', // Light Green
              border: '#10B981',
              text: '#1F2937'
            }
          }
        case 'todo':
        default:
          return {
            bg: '#9CA3AF', // Grey
            border: '#6B7280',
            text: '#ffffff'
          }
      }
    }

    // Prepare data for vis-timeline
    const items = new DataSet(
      tasks.map(task => {
        const isCritical = criticalPathTasks?.has(task.id)
        const colors = getTaskColor(task.status || 'todo', task.progress || 0)
        
        let itemClassName = 'gantt-task-item'
        let itemStyle = `
          background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%);
          border: 2px solid ${colors.border};
          border-radius: 6px;
          color: ${colors.text};
          font-weight: 500;
          padding: 4px 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        `

        if (isCritical) {
          itemClassName += ' vis-item-critical'
          itemStyle += `
            border: 3px solid #EF4444;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.4), 0 4px 8px rgba(0,0,0,0.2);
            animation: pulse 2s infinite;
          `
        }

        // Add progress bar overlay
        if (task.progress > 0 && task.progress < 100) {
          itemStyle += `
            background: linear-gradient(
              to right,
              ${colors.bg} 0%,
              ${colors.bg} ${task.progress}%,
              ${colors.bg}66 ${task.progress}%,
              ${colors.bg}66 100%
            );
          `
        }

        const elementCount = task.elementLinks?.length || 0
        const assigneeName = task.assignee?.fullName || 'Unassigned'
        const teamName = task.team?.name || 'No team'

        return {
          id: task.id,
          content: `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 600;">${task.name}</span>
              ${elementCount > 0 ? `<span style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 10px; font-size: 11px;">🔗 ${elementCount}</span>` : ''}
            </div>
          `,
          start: task.startDate ? new Date(task.startDate) : new Date(),
          end: task.endDate ? new Date(task.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          style: itemStyle,
          className: itemClassName,
          title: `
            <div style="padding: 8px;">
              <strong style="font-size: 14px;">${task.name}</strong><br/>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="margin: 4px 0;">📊 Progress: <strong>${Number(task.progress || 0).toFixed(0)}%</strong></div>
                <div style="margin: 4px 0;">👤 Assignee: <strong>${assigneeName}</strong></div>
                <div style="margin: 4px 0;">👥 Team: <strong>${teamName}</strong></div>
                <div style="margin: 4px 0;">🔗 Elements: <strong>${elementCount}</strong></div>
                <div style="margin: 4px 0;">📅 Status: <strong style="text-transform: capitalize;">${(task.status || 'todo').replace('_', ' ')}</strong></div>
              </div>
            </div>
          `
        }
      })
    )

    const options = {
      stack: true,
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),   // 90 days from now
      editable: false,
      selectable: true,
      zoomable: true,
      moveable: true,
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
          vertical: 8
        }
      },
      orientation: 'top',
      showCurrentTime: true,
      showMajorLabels: true,
      showMinorLabels: true
    }

    // Create timeline
    timeline.current = new Timeline(timelineRef.current, items)

    // Add click event listener
    if (onTaskClick) {
      timeline.current.on('select', (properties) => {
        if (properties.items && properties.items.length > 0) {
          const taskId = properties.items[0]
          const task = tasks.find(t => t.id === taskId)
          if (task) {
            onTaskClick(task)
          }
        }
      })
    }

    // Cleanup
    return () => {
      if (timeline.current) {
        timeline.current.destroy()
      }
    }
  }, [tasks, criticalPathTasks])

  if (!tasks.length) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-dashed border-blue-200">
        <div className="text-center p-8">
          <div className="text-7xl mb-4 animate-bounce">📅</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Tasks Yet</h3>
          <p className="text-gray-600 mb-4">Create tasks with linked 3D elements to see them on the timeline</p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              Not Started
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              In Progress
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Completed
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gantt-chart-wrapper">
      <style jsx global>{`
        .gantt-chart-wrapper {
          width: 100%;
          min-height: 600px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .gantt-chart-wrapper > div {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .vis-timeline {
          border: none !important;
          font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        }

        .vis-panel.vis-top {
          border-bottom: 2px solid #e5e7eb !important;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
        }

        .vis-panel.vis-center {
          background: #ffffff !important;
        }

        .vis-time-axis .vis-text {
          color: #475569 !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }

        .vis-time-axis .vis-text.vis-major {
          color: #1e293b !important;
          font-weight: 700 !important;
          font-size: 14px !important;
        }

        .vis-item {
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          position: relative !important;
        }

        .vis-item::after {
          content: '✏️ Click to update';
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }

        .vis-item:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2) !important;
          z-index: 999 !important;
        }

        .vis-item:hover::after {
          opacity: 1;
        }

        .vis-item.vis-selected {
          border-width: 3px !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 8px 16px rgba(0,0,0,0.2) !important;
          transform: scale(1.05);
        }

        .vis-item-critical {
          animation: pulse-critical 2s ease-in-out infinite;
          position: relative;
        }

        .vis-item-critical::before {
          content: '⚠️';
          position: absolute;
          left: -20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          animation: bounce 1s infinite;
        }

        @keyframes pulse-critical {
          0%, 100% {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.9);
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-60%) scale(1.1); }
        }

        .vis-current-time {
          background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%) !important;
          width: 3px !important;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.6) !important;
          z-index: 10 !important;
        }

        .vis-current-time::before {
          content: '📍';
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 18px;
        }

        .vis-labelset .vis-label {
          color: #475569 !important;
          font-weight: 600 !important;
          border-bottom: 1px solid #e5e7eb !important;
          background: #f8fafc !important;
        }

        .vis-foreground .vis-group {
          border-bottom: 1px solid #f1f5f9 !important;
        }

        .vis-foreground .vis-group:hover {
          background: #f8fafc !important;
        }

        .vis-tooltip {
          background: white !important;
          border: none !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2) !important;
          padding: 0 !important;
          font-family: 'Inter', system-ui, sans-serif !important;
          max-width: 320px !important;
          overflow: hidden !important;
        }

        .vis-time-axis .vis-grid.vis-minor {
          border-color: #f1f5f9 !important;
        }

        .vis-time-axis .vis-grid.vis-major {
          border-color: #e2e8f0 !important;
          border-width: 2px !important;
        }

        .vis-time-axis .vis-grid.vis-saturday,
        .vis-time-axis .vis-grid.vis-sunday {
          background: #fef3c7 !important;
        }

        /* Scrollbar styling */
        .vis-timeline::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .vis-timeline::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 5px;
        }

        .vis-timeline::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
          border-radius: 5px;
          border: 2px solid #f1f5f9;
        }

        .vis-timeline::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #64748b 0%, #475569 100%);
        }

        .vis-timeline::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
      `}</style>
      <div 
        ref={timelineRef} 
        className="w-full h-[600px]"
      />
    </div>
  )
}