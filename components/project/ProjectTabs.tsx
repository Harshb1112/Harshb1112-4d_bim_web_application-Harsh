/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Box, Calendar, Play, Link2, Users, UploadCloud, BarChart3, Bug } from 'lucide-react'
import UnifiedModelViewer from './UnifiedModelViewer'
import EnhancedScheduleManager from './tabs/EnhancedScheduleManager'
import FourDSimulation from './tabs/FourDSimulation'
import LinkingPanel from './LinkingPanel'
import TeamManagement from './tabs/TeamManagement'
import ImportExport from './tabs/ImportExport'
import AnalyticsDashboard from './tabs/AnalyticsDashboard'
import ErrorLogViewer from './tabs/ErrorLogViewer'

interface ProjectTabsProps {
  project: any
  currentUserRole: string
  currentUserId?: number
  userSeniority?: string | null
}

export default function ProjectTabs({ project, currentUserRole, currentUserId, userSeniority }: ProjectTabsProps) {
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('models')

  const handleImportSuccess = () => {
    // Potentially refresh data or switch tabs
    setActiveTab('schedule')
  }

  function handleElementSelection(elementId: string, element: any): void {
    // Handle element selection from Speckle viewer
    setSelectedElements(prev => 
      prev.includes(elementId) 
        ? prev.filter(id => id !== elementId) 
        : [...prev, elementId]
    )
    console.log('Element selected:', elementId, element)
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full max-w-full ${
          currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader' 
            ? 'grid-cols-8' 
            : 'grid-cols-7'
        }`}>
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
          {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && (
            <TabsTrigger value="team" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <UploadCloud className="h-4 w-4" />
            <span>Import/Export</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center space-x-2">
            <Bug className="h-4 w-4" />
            <span>Error Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <UnifiedModelViewer 
            project={project}
            onElementSelect={handleElementSelection}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <EnhancedScheduleManager 
            project={project} 
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            userSeniority={userSeniority}
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

        {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && (
          <TabsContent value="team" className="space-y-6">
            <TeamManagement project={project} />
          </TabsContent>
        )}

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