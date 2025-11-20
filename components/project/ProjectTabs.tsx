/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Box, Calendar, Play, Link2, Users, UploadCloud, BarChart3, Bug } from 'lucide-react'
import ModelViewer from './tabs/ModelViewer'
import ScheduleManager from './tabs/ScheduleManager'
import FourDSimulation from './tabs/FourDSimulation'
import LinkingPanel from './LinkingPanel'
import TeamManagement from './tabs/TeamManagement'
import ImportExport from './tabs/ImportExport'
import AnalyticsDashboard from './tabs/AnalyticsDashboard'
import ErrorLogViewer from './tabs/ErrorLogViewer' // Import new component

interface ProjectTabsProps {
  project: any
}

export default function ProjectTabs({ project }: ProjectTabsProps) {
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [, setSpeckleElements] = useState<any[]>([])
  const [ ,setSpeckleConnected] = useState(false)
  const [activeTab, setActiveTab] = useState('models')


  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    )
  }

  const handleImportSuccess = () => {
    // Potentially refresh data or switch tabs
    setActiveTab('schedule')
  }

  function handleElementSelection(_elementId: string, _element: any): void {
    throw new Error('Function not implemented.')
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 max-w-full"> {/* Increased grid columns for new tab */}
          <TabsTrigger value="models" className="flex items-center space-x-2">
            <Box className="h-4 w-4" />
            <span>3D Models</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="linking" className="flex items-center space-x-2">
            <Link2 className="h-4 w-4" />
            <span>4D Linking</span>
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>4D Simulation</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Team</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <UploadCloud className="h-4 w-4" />
            <span>Import/Export</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center space-x-2"> {/* New Error Logs Tab */}
            <Bug className="h-4 w-4" />
            <span>Error Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <ModelViewer 
            project={project} 
            onElementSelect={handleElementSelection}
            selectedElements={selectedElements}
            onConnectionChange={(connected, elements) => {
              setSpeckleConnected(connected)
              setSpeckleElements(elements)
            }}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <ScheduleManager 
            project={project} 
            onTaskSelect={handleTaskSelect}
            selectedTasks={selectedTasks}
          />
        </TabsContent>

        <TabsContent value="linking" className="space-y-6">
          <LinkingPanel 
            project={project}
            selectedElements={selectedElements}
            selectedTasks={selectedTasks}
            onElementSelect={setSelectedElements}
            onTaskSelect={setSelectedTasks}
          />
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          <FourDSimulation 
            project={project} 
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard project={project} />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <TeamManagement project={project} />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <ImportExport project={project} onImportSuccess={handleImportSuccess} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-6"> {/* New Error Logs Content */}
          <ErrorLogViewer projectId={project.id} />
        </TabsContent>
      </Tabs>
    </main>
  )
}