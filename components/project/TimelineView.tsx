'use client';

import { useMemo, useState } from 'react';
import { format, differenceInDays, addDays, startOfMonth } from 'date-fns';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import MSProjectImportDialog from './MSProjectImportDialog';

interface TimelineViewProps {
  tasks: any[];
  projectId: number;
  onRefresh?: () => void;
}

export default function TimelineView({ tasks, projectId, onRefresh }: TimelineViewProps) {
  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Calculate timeline
  const timeline = useMemo(() => {
    if (tasks.length === 0) return null;

    const dates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const totalDays = differenceInDays(maxDate, minDate);

    return {
      start: minDate,
      end: maxDate,
      totalDays,
      currentDate: addDays(minDate, currentDay),
    };
  }, [tasks, currentDay]);

  // Get tasks active on current day
  const activeTasks = useMemo(() => {
    if (!timeline) return [];

    return tasks.filter(task => {
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      return timeline.currentDate >= taskStart && timeline.currentDate <= taskEnd;
    });
  }, [tasks, timeline]);

  // Get completed tasks
  const completedTasks = useMemo(() => {
    if (!timeline) return [];

    return tasks.filter(task => {
      const taskEnd = new Date(task.endDate);
      return timeline.currentDate > taskEnd;
    });
  }, [tasks, timeline]);

  // Get upcoming tasks
  const upcomingTasks = useMemo(() => {
    if (!timeline) return [];

    return tasks.filter(task => {
      const taskStart = new Date(task.startDate);
      return timeline.currentDate < taskStart;
    });
  }, [tasks, timeline]);

  // Playback control
  const handlePlay = () => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentDay(prev => {
        if (prev >= (timeline?.totalDays || 0)) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentDay(0);
    setIsPlaying(false);
  };

  const handleEnd = () => {
    setCurrentDay(timeline?.totalDays || 0);
    setIsPlaying(false);
  };

  if (!timeline || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-6">No timeline data available</p>
          <MSProjectImportDialog 
            projectId={projectId} 
            onImportSuccess={onRefresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className="bg-white border-b p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">4D Timeline Simulation</h2>
            <MSProjectImportDialog 
              projectId={projectId} 
              onImportSuccess={onRefresh}
            />
          </div>
          
          {/* Current Date Display */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {format(timeline.currentDate, 'MMMM dd, yyyy')}
            </div>
            <div className="text-sm text-gray-600">
              Day {currentDay + 1} of {timeline.totalDays + 1}
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="mb-4">
            <Slider
              value={[currentDay]}
              onValueChange={(value) => setCurrentDay(value[0])}
              max={timeline.totalDays}
              step={1}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>{format(timeline.start, 'MMM dd, yyyy')}</span>
              <span>{format(timeline.end, 'MMM dd, yyyy')}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={isPlaying}
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            {isPlaying ? (
              <Button onClick={handlePause}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={handlePlay}>
                <Play className="w-4 h-4 mr-2" />
                Play
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleEnd}
              disabled={isPlaying}
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
                disabled={isPlaying}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* Completed Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Completed ({completedTasks.length})
              </h3>
              <div className="space-y-2">
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <p className="font-medium text-sm text-gray-900">{task.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Ended: {format(new Date(task.endDate), 'MMM dd')}
                    </p>
                  </div>
                ))}
                {completedTasks.length === 0 && (
                  <p className="text-sm text-gray-500">No completed tasks yet</p>
                )}
              </div>
            </div>

            {/* Active Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                Active ({activeTasks.length})
              </h3>
              <div className="space-y-2">
                {activeTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <p className="font-medium text-sm text-gray-900">{task.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {format(new Date(task.startDate), 'MMM dd')} - {format(new Date(task.endDate), 'MMM dd')}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-yellow-500 h-1.5 rounded-full"
                        style={{ 
                          width: `${Math.min(
                            100,
                            (differenceInDays(timeline.currentDate, new Date(task.startDate)) / 
                            differenceInDays(new Date(task.endDate), new Date(task.startDate))) * 100
                          )}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
                {activeTasks.length === 0 && (
                  <p className="text-sm text-gray-500">No active tasks</p>
                )}
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                Upcoming ({upcomingTasks.length})
              </h3>
              <div className="space-y-2">
                {upcomingTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <p className="font-medium text-sm text-gray-900">{task.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Starts: {format(new Date(task.startDate), 'MMM dd')}
                    </p>
                  </div>
                ))}
                {upcomingTasks.length === 0 && (
                  <p className="text-sm text-gray-500">No upcoming tasks</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
