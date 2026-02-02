'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Box} from 'lucide-react';
import UnifiedModelViewer, { UnifiedModelViewerRef } from '@/components/project/UnifiedModelViewer';
import ElementSelectionToolbar, { SelectionMode } from '@/components/project/ElementSelectionToolbar';
import CreateTaskFromElementsDialog from '@/components/project/CreateTaskFromElementsDialog';
import ProjectHeader from '@/components/project/ProjectHeader';
import ScheduleView from '@/components/project/ScheduleView';
import TaskDetailsPanel from '@/components/project/TaskDetailsPanel';
import TasksSidebar from '@/components/project/TasksSidebar';
import TimelineView from '@/components/project/TimelineView';
import { toast } from 'sonner';

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;
  const viewerRef = useRef<UnifiedModelViewerRef>(null);

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Selection state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [selectedElements, setSelectedElements] = useState<Array<{
    id: string;
    type?: string;
    name?: string;
    properties?: any;
  }>>([]);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      // Load project details
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectRes.json();
      setProject(projectData);

      // Load tasks
      const tasksRes = await fetch(`/api/projects/${projectId}/tasks`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      // Load teams
      const teamsRes = await fetch(`/api/teams?projectId=${projectId}`);
      const teamsData = await teamsRes.json();
      setTeams(teamsData);

      // Load users
      const usersRes = await fetch(`/api/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading project:', error);
      setLoading(false);
    }
  };

  // Handle element selection from viewer
  const handleElementSelect = (elementId: string, element: any) => {
    console.log('[Workspace] Element selected:', elementId, element);
    
    // Check if this is a multi-select event (from box/lasso selection)
    if (element.allSelected && Array.isArray(element.allSelected)) {
      // Multi-select: replace entire selection
      const newElements = element.allSelected.map((id: string) => ({
        id,
        type: element.type || 'Element',
        name: element.name || id,
        properties: element.properties || element.userData
      }));
      setSelectedElements(newElements);
      toast.success(`Selected ${newElements.length} elements`);
      return;
    }
    
    // Single select behavior based on mode
    if (selectionMode === 'single') {
      // Replace selection
      setSelectedElements([{
        id: elementId,
        type: element.type || element.typeName || 'Element',
        name: element.name || elementId,
        properties: element.properties || element.userData
      }]);
    } else {
      // Multi-select mode: toggle element
      setSelectedElements(prev => {
        const exists = prev.find(el => el.id === elementId);
        if (exists) {
          // Remove from selection
          return prev.filter(el => el.id !== elementId);
        } else {
          // Add to selection
          return [...prev, {
            id: elementId,
            type: element.type || element.typeName || 'Element',
            name: element.name || elementId,
            properties: element.properties || element.userData
          }];
        }
      });
    }
  };

  // Handle selection mode change
  const handleSelectionModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode);
    toast.info(`Selection mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
  };

  // Handle create task from selection
  const handleCreateTask = () => {
    if (selectedElements.length === 0) {
      toast.error('No elements selected');
      return;
    }
    setCreateTaskDialogOpen(true);
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedElements([]);
    if (viewerRef.current) {
      viewerRef.current.unIsolateObjects();
    }
    toast.info('Selection cleared');
  };

  // Handle export selection
  const handleExportSelection = () => {
    if (selectedElements.length === 0) {
      toast.error('No elements selected');
      return;
    }
    
    // Create CSV content
    const headers = ['Element ID', 'Type', 'Name'];
    const rows = selectedElements.map(el => [
      el.id,
      el.type || 'Unknown',
      el.name || el.id
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-elements-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedElements.length} elements`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <ProjectHeader project={project} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tasks */}
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
          <TasksSidebar 
            tasks={tasks} 
            selectedTask={selectedTask}
            onSelectTask={setSelectedTask}
            projectId={projectId}
            onTasksUpdate={loadProjectData}
          />
        </div>

        {/* Center - 3D Viewer with Selection Toolbar */}
        <div className="flex-1 flex">
          {/* Selection Toolbar - Left Side */}
          <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
            <ElementSelectionToolbar
              selectedElements={selectedElements}
              onSelectionModeChange={handleSelectionModeChange}
              onCreateTask={handleCreateTask}
              onClearSelection={handleClearSelection}
              onExportSelection={handleExportSelection}
              selectionMode={selectionMode}
            />
          </div>

          {/* Viewer Area */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start border-b border-gray-200 dark:border-gray-800 rounded-none bg-white dark:bg-gray-900 px-4">
                <TabsTrigger value="overview" className="gap-2">
                  <Box className="w-4 h-4" />
                  3D Model
                </TabsTrigger>
                <TabsTrigger value="schedule" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 m-0">
                <UnifiedModelViewer 
                  ref={viewerRef}
                  project={project} 
                  onElementSelect={handleElementSelect}
                  selectedElements={selectedElements.map(el => el.id)}
                />
              </TabsContent>

              <TabsContent value="schedule" className="flex-1 m-0 p-4">
                <ScheduleView tasks={tasks} />
              </TabsContent>

              <TabsContent value="timeline" className="flex-1 m-0 p-4">
                <TimelineView tasks={tasks} projectId={0} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Task Details */}
        {selectedTask && (
          <div className="w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
            <TaskDetailsPanel 
              task={selectedTask} 
              onUpdate={loadProjectData}
            />
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <CreateTaskFromElementsDialog
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        selectedElements={selectedElements}
        projectId={parseInt(projectId)}
        teams={teams}
        users={users}
        onTaskCreated={() => {
          loadProjectData();
          setSelectedElements([]);
          if (viewerRef.current) {
            viewerRef.current.unIsolateObjects();
          }
        }}
      />
    </div>
  );
}
