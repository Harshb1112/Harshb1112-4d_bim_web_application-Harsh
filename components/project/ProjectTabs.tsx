/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Box, Calendar, Play, Link2, Users, Briefcase, Brain, Trash2, Activity, FileText, Shield, File, Database, Settings, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import UnifiedModelViewer from './UnifiedModelViewer'
import EnhancedScheduleManager from './tabs/EnhancedScheduleManager'
import FourDSimulation from './tabs/FourDSimulation'
import LinkingPanel from './LinkingPanel'
import TeamManagement from './tabs/TeamManagement'
import AddModelDialog from './AddModelDialog'
import ProjectDashboard from './tabs/ProjectDashboard'
import ResourceManagement from './tabs/ResourceManagement'
import AIInsights from './tabs/AIInsights'
import AITaskGenerator from './AITaskGenerator'
import ProjectSettings from './tabs/ProjectSettings'

// Import page components
import dynamic from 'next/dynamic'

// Dynamically import page components to avoid SSR issues
const HealthPageContent = dynamic(() => import('./tabs/HealthPageContent'), { ssr: false })
const DailyLogPageContent = dynamic(() => import('./tabs/DailyLogPageContent'), { ssr: false })
const SafetyPageContent = dynamic(() => import('./tabs/SafetyPageContent'), { ssr: false })
const FilesPageContent = dynamic(() => import('./tabs/FilesPageContent'), { ssr: false })
const BackupsPageContent = dynamic(() => import('./tabs/BackupsPageContent'), { ssr: false })

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
  const [modelToDelete, setModelToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['dashboard', 'schedule', 'models', 'linking', 'simulation', 'resources', 'team', 'ai-insights', 'health', 'daily-log', 'safety', 'files', 'backups', 'integrations', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleModelAdded = () => {
    // Refresh the page to show new model
    router.refresh()
  }

  const handleDeleteModel = async () => {
    if (!modelToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/models/${modelToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete model')
      }

      toast.success(`Model "${modelToDelete.name}" deleted successfully`)
      setModelToDelete(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete model')
    } finally {
      setIsDeleting(false)
    }
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

  function handleProjectUpdate(): void {
    throw new Error('Function not implemented.')
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex w-full bg-gray-100 dark:bg-gray-800 overflow-x-auto h-auto p-1 justify-start">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Health</span>
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
          <TabsTrigger value="daily-log" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Daily Log</span>
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Safety</span>
          </TabsTrigger>
          {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && (
            <TabsTrigger value="team" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="files" className="flex items-center space-x-2">
            <File className="h-4 w-4" />
            <span>Files</span>
          </TabsTrigger>
          <TabsTrigger value="backups" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Backups</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <Link2 className="h-4 w-4" />
            <span>Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Insights</span>
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
                        className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Box className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{model.name || `Model ${model.id}`}</span>
                          </div>
                          {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setModelToDelete(model)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
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

        <TabsContent value="health" className="space-y-6">
          <HealthPageContent projectId={project.id} />
        </TabsContent>

        <TabsContent value="daily-log" className="space-y-6">
          <DailyLogPageContent projectId={project.id} />
        </TabsContent>

        <TabsContent value="safety" className="space-y-6">
          <SafetyPageContent projectId={project.id} />
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <FilesPageContent projectId={project.id} />
        </TabsContent>

        <TabsContent value="backups" className="space-y-6">
          <BackupsPageContent projectId={project.id} />
        </TabsContent>
        
        <TabsContent value="integrations" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Integrations</h2>
            <p className="text-sm text-gray-600 mb-6">Connect BIMBOSS with your SAP/ERP systems</p>
          </div>

          {/* Inner Tabs for Export to SAP and Webhook API */}
          <Tabs defaultValue="sap-export" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="sap-export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export to SAP
              </TabsTrigger>
              <TabsTrigger value="webhook" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Webhook API
              </TabsTrigger>
            </TabsList>

            {/* Export to SAP Tab Content */}
            <TabsContent value="sap-export" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SAP Project System Export Card */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      SAP Project System Export
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Generate CSV or XML files compatible with SAP PS for import
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Supported exports:</p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• WBS Elements (PRJDEF1)</li>
                        <li>• Network Activities (LOIPRO)</li>
                        <li>• Cost Elements (COELEM)</li>
                        <li>• Work Centers (CREMAS)</li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={() => router.push(`/project/${project.id}/integrations/sap-export`)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export to SAP
                    </Button>
                  </CardContent>
                </Card>

                {/* Data Flow Card */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Data Flow</CardTitle>
                    <CardDescription className="text-sm">
                      How data moves between BIMBOSS and SAP
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center gap-8 py-6 bg-gray-50 rounded-lg">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center mb-2">
                          <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium">BIMBOSS</span>
                      </div>
                      
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center mb-2">
                          <span className="text-lg font-bold text-blue-600">SAP</span>
                        </div>
                        <span className="text-xs font-medium">SAP PS</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-4">
                      Export project data as CSV/XML files, then import into SAP using standard transactions (CJ20N, CN21, etc.)
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Webhook API Tab Content */}
            <TabsContent value="webhook" className="space-y-6">
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Webhook API Configuration
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Configure webhook integration for real-time updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Real-time event notifications</li>
                      <li>• API key management</li>
                      <li>• Integration logs</li>
                      <li>• Custom webhooks</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={() => router.push(`/project/${project.id}/integrations/webhook`)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Webhook
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <ProjectSettings 
            project={project}
            onUpdate={handleProjectUpdate}
          />
        </TabsContent>

      </Tabs>

      {/* Delete Model Confirmation Dialog */}
      <AlertDialog open={!!modelToDelete} onOpenChange={() => setModelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{modelToDelete?.name}</strong>?
              <br />
              <br />
              This will permanently remove the model and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}