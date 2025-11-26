'use client';

import { useMemo } from 'react';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, Clock, User } from 'lucide-react';

interface ScheduleViewProps {
  tasks: any[];
}

export default function ScheduleView({ tasks }: ScheduleViewProps) {
  // Calculate project timeline
  const timeline = useMemo(() => {
    if (tasks.length === 0) return null;

    const dates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    return {
      start: startOfWeek(minDate),
      end: endOfWeek(maxDate),
      totalDays: differenceInDays(maxDate, minDate),
    };
  }, [tasks]);

  // Group tasks by week
  const tasksByWeek = useMemo(() => {
    if (!timeline) return [];

    const weeks: any[] = [];
    let currentDate = timeline.start;

    while (currentDate <= timeline.end) {
      const weekEnd = endOfWeek(currentDate);
      const weekTasks = tasks.filter(task => {
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);
        return (
          (taskStart >= currentDate && taskStart <= weekEnd) ||
          (taskEnd >= currentDate && taskEnd <= weekEnd) ||
          (taskStart <= currentDate && taskEnd >= weekEnd)
        );
      });

      weeks.push({
        start: currentDate,
        end: weekEnd,
        tasks: weekTasks,
      });

      currentDate = addDays(weekEnd, 1);
    }

    return weeks;
  }, [tasks, timeline]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-100 border-green-500 text-green-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'ON_HOLD': return 'bg-orange-100 border-orange-500 text-orange-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  if (!timeline || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No tasks scheduled yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Schedule</h2>
          <p className="text-gray-600">
            {format(timeline.start, 'MMM dd, yyyy')} - {format(timeline.end, 'MMM dd, yyyy')}
            <span className="ml-4 text-sm">
              ({timeline.totalDays} days)
            </span>
          </p>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-6">
          {tasksByWeek.map((week, weekIndex) => (
            <div key={weekIndex} className="bg-white rounded-lg border p-4">
              {/* Week Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Week {weekIndex + 1}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {format(week.start, 'MMM dd')} - {format(week.end, 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {week.tasks.length}
                  </p>
                  <p className="text-sm text-gray-600">Tasks</p>
                </div>
              </div>

              {/* Tasks */}
              {week.tasks.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No tasks this week</p>
              ) : (
                <div className="space-y-3">
                  {week.tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-lg border-l-4 ${getStatusColor(task.status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {task.name}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(task.startDate), 'MMM dd')} - {format(new Date(task.endDate), 'MMM dd')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {task.duration} days
                            </div>
                            {task.assignee && (
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {task.assignee.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {task.progress}%
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
