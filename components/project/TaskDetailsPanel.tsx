'use client';

import { useState } from 'react';
import { 
  Calendar, 
  User, 
  Clock, 
  Link2, 
  CheckCircle2,
  Edit,
  Trash2,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface TaskDetailsPanelProps {
  task: any;
  onUpdate: () => void;
}

export default function TaskDetailsPanel({ task, onUpdate }: TaskDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: task.name,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    startDate: task.startDate,
    endDate: task.endDate,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-500';
      case 'IN_PROGRESS': return 'bg-yellow-500';
      case 'ON_HOLD': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Task Details</h2>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Task Name */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Task Name
          </label>
          {isEditing ? (
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          ) : (
            <p className="text-gray-900">{task.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Description
          </label>
          {isEditing ? (
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          ) : (
            <p className="text-gray-600 text-sm">
              {task.description || 'No description'}
            </p>
          )}
        </div>

        {/* Status & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Status
            </label>
            {isEditing ? (
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace('_', ' ')}
              </Badge>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Priority
            </label>
            {isEditing ? (
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Progress: {isEditing ? formData.progress : task.progress}%
          </label>
          {isEditing ? (
            <Slider
              value={[formData.progress]}
              onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
              max={100}
              step={5}
            />
          ) : (
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Start Date
            </label>
            {isEditing ? (
              <Input
                type="date"
                value={formData.startDate?.split('T')[0]}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            ) : (
              <p className="text-sm text-gray-600">
                {new Date(task.startDate).toLocaleDateString()}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              End Date
            </label>
            {isEditing ? (
              <Input
                type="date"
                value={formData.endDate?.split('T')[0]}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            ) : (
              <p className="text-sm text-gray-600">
                {new Date(task.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Duration
          </label>
          <p className="text-sm text-gray-600">{task.duration} days</p>
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
              <User className="w-4 h-4" />
              Assigned To
            </label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {task.assignee.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{task.assignee.name}</p>
                <p className="text-xs text-gray-500">{task.assignee.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Linked Elements */}
        {task.elements && task.elements.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              <Link2 className="w-4 h-4" />
              Linked 3D Elements ({task.elements.length})
            </label>
            <div className="space-y-2">
              {task.elements.slice(0, 5).map((element: any) => (
                <div
                  key={element.id}
                  className="p-2 bg-gray-50 rounded text-xs"
                >
                  <p className="font-medium">{element.elementType}</p>
                  <p className="text-gray-500">{element.elementId}</p>
                </div>
              ))}
              {task.elements.length > 5 && (
                <p className="text-xs text-gray-500">
                  +{task.elements.length - 5} more elements
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {task.dependencies && task.dependencies.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Dependencies
            </label>
            <div className="space-y-2">
              {task.dependencies.map((dep: any) => (
                <div
                  key={dep.id}
                  className="p-2 bg-gray-50 rounded text-xs"
                >
                  <p className="font-medium">{dep.predecessor.name}</p>
                  <p className="text-gray-500">{dep.type} relationship</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
