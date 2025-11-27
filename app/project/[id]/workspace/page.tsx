'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Box} from 'lucide-react';
import ModelViewer from '@/components/project/ModelViewer';
import ProjectHeader from '@/components/project/ProjectHeader';
import ScheduleView from '@/components/project/ScheduleView';
import TaskDetailsPanel from '@/components/project/TaskDetailsPanel';
import TasksSidebar from '@/components/project/TasksSidebar';
import TimelineView from '@/components/project/TimelineView';

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

      setLoading(false);
    } catch (error) {
      console.error('Error loading project:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <ProjectHeader project={project} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tasks */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <TasksSidebar 
            tasks={tasks} 
            selectedTask={selectedTask}
            onSelectTask={setSelectedTask}
            projectId={projectId}
            onTasksUpdate={loadProjectData}
          />
        </div>

        {/* Center - 3D Viewer */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none bg-white px-4">
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
              <ModelViewer 
                project={project} 
                selectedTask={selectedTask}
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

        {/* Right Sidebar - Task Details */}
        {selectedTask && (
          <div className="w-96 bg-white border-l overflow-y-auto">
            <TaskDetailsPanel 
              task={selectedTask} 
              onUpdate={loadProjectData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
