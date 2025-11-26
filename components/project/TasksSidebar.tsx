'use client';

import { useState } from 'react';
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Circle, 
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import CreateTaskDialog from './CreateTaskDialog';

interface TasksSidebarProps {
  tasks: any[];
  selectedTask: any;
  onSelectTask: (task: any) => void;
  projectId: string;
  onTasksUpdate: () => void;
}

export default function TasksSidebar({ 
  tasks, 
  selectedTask, 
  onSelectTask,
  projectId,
  onTasksUpdate 
}: TasksSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'ON_HOLD':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Build task hierarchy
  const rootTasks = tasks.filter(t => !t.parentId);
  const getChildren = (parentId: string) => tasks.filter(t => t.parentId === parentId);

  const renderTask = (task: any, level: number = 0) => {
    const children = getChildren(task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const isSelected = selectedTask?.id === task.id;

    return (
      <div key={task.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50
            ${isSelected ? 'bg-blue-50 border-l-2 border-blue-600' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => onSelectTask(task)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(task.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          {getStatusIcon(task.status)}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 truncate">
                {task.name}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {task.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div
                className={`h-1 rounded-full ${getProgressColor(task.progress)}`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map(child => renderTask(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTasks = rootTasks.filter(task =>
    task.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          <Button 
            size="sm" 
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>

        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks found</p>
              <Button 
                variant="link" 
                onClick={() => setShowCreateDialog(true)}
                className="mt-2"
              >
                Create your first task
              </Button>
            </div>
          ) : (
            filteredTasks.map(task => renderTask(task))
          )}
        </div>
      </ScrollArea>

      {/* Task Stats */}
      <div className="p-4 border-t bg-gray-50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {tasks.filter(t => t.status === 'TODO').length}
            </div>
            <div className="text-xs text-gray-600">To Do</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {tasks.filter(t => t.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-xs text-gray-600">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'DONE').length}
            </div>
            <div className="text-xs text-gray-600">Done</div>
          </div>
        </div>
      </div>

      {/* Create Task Dialog */}
      {showCreateDialog && (
        <CreateTaskDialog
          projectId={projectId}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            onTasksUpdate();
          }}
        />
      )}
    </div>
  );
}
