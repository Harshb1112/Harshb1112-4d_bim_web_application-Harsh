/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Box, Calendar, Play, Link2, Users, UploadCloud, Bug, Briefcase, Brain } from 'lucide-react'
import UnifiedModelViewer from './UnifiedModelViewer'
import EnhancedScheduleManager from './tabs/EnhancedScheduleManager'
import FourDSimulation from './tabs/FourDSimulation'
import LinkingPanel from './LinkingPanel'
import TeamManagement from './tabs/TeamManagement'
import ImportExport from './tabs/ImportExport'
import ErrorLogViewer from './tabs/ErrorLogViewer'
import AddModelDialog from './AddModelDialog'
import ProjectDashboard from './tabs/ProjectDashboard'
import ResourceManagement from './tabs/ResourceManagement'
import AIInsights from './tabs/AIInsights'

interface ProjectTabsProps {
  project: any
  currentUserRole: string
  currentUserId?: number
  userSeniority?: string | null
}

export default function ProjectTabs({ project, currentUserRole, currentUserId, userSeniority }: ProjectTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')

  // Handle tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['dashboard', 'schedule', 'models', 'linking', 'simulation', 'resources', 'team', 'ai-insights', 'import', 'errors'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleImportSuccess = () => {
    // Potentially refresh data or switch tabs
    setActiveTab('schedule')
  }

  const handleModelAdded = () => {
    // Refresh the page to show new model
    router.refresh()
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
        <TabsList className={`grid w-full max-w-full bg-gray-100 dark:bg-gray-800 ${
          currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader' 
            ? 'grid-cols-10' 
            : 'grid-cols-9'
        }`}>
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center space-x-2">
            <Box className="h-4 w-4" />
            <span>3D Models</span>
          </TabsTrigger>
          <TabsTrigger value="linking" className="flex items-center space-x-2">
            <Link2 className="h-4 w-4" />
            <span>4D Linking</span>
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>4D Simulation</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center space-x-2">
            <Briefcase className="h-4 w-4" />
            <span>Resources</span>
          </TabsTrigger>
          {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && (
            <TabsTrigger value="team" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <UploadCloud className="h-4 w-4" />
            <span>Import/Export</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center space-x-2">
            <Bug className="h-4 w-4" />
            <span>Error Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab - Project Overview */}
        <TabsContent value="dashboard" className="space-y-6">
          <ProjectDashboard project={project} />
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          {/* Model List and Viewer - Show only if models exist */}
          {project.models && project.models.length > 0 ? (
            <>
              {/* 3D Models Header */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-xl">3D Models</CardTitle>
                    <CardDescription>View and manage BIM models for this project</CardDescription>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Model List */}
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Models ({project.models.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {project.models.map((model: any) => (
                      <div 
                        key={model.id} 
                        className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium truncate">{model.name || `Model ${model.id}`}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Source: {model.source || 'Unknown'}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Viewer */}
                <div className="lg:col-span-3">
                  <UnifiedModelViewer 
                    project={project}
                    onElementSelect={handleElementSelection}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Empty State - Show Add Model button only when no models */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Box className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No 3D models added yet</h3>
                <p className="text-sm text-gray-500 mb-4">Add your first 3D model to get started</p>
                {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && (
                  <AddModelDialog projectId={project.id} onModelAdded={handleModelAdded} />
                )}
              </CardContent>
            </Card>
          )}
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
            currentUserRole={currentUserRole}
          />
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          <FourDSimulation 
            project={project}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <ResourceManagement project={project} currentUserRole={currentUserRole} />
        </TabsContent>

        {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && (
          <TabsContent value="team" className="space-y-6">
            <TeamManagement project={project} />
          </TabsContent>
        )}

        <TabsContent value="ai-insights" className="space-y-6">
          <AIInsights project={project} />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <ImportExport project={project} onImportSuccess={handleImportSuccess} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <ErrorLogViewer projectId={project.id} />
        </TabsContent>
      </Tabs>
    </main>
  )
}