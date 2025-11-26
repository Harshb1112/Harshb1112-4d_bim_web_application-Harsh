/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Calendar, CheckCircle2 } from 'lucide-react'
import { formatDate, calculateProgress } from '@/lib/utils'
import CreateProjectDialog from '@/components/dashboard/CreateProjectDialog'

interface Project {
  id: number
  name: string
  description?: string
  startDate?: Date
  endDate?: Date
  _count: {
    tasks: number
    models: number
  }
  tasks: Array<{
    progress: number
  }>
}

interface ProjectGridProps {
  projects: Project[]
  userRole?: string
}

export default function ProjectGrid({ projects, userRole }: ProjectGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{projects.length} projects</span>
          {(userRole === 'admin' || userRole === 'manager') && <CreateProjectDialog label="New Project" />}
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 text-center mb-4">
              Get started by creating your first 4D BIM project
            </p>
            {(userRole === 'admin' || userRole === 'manager') && <CreateProjectDialog label="Create Project" />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = calculateProgress(project.tasks)
            
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <span className="text-xs text-gray-500">
                      {progress}% complete
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Project Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{project._count.tasks} tasks</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-4 w-4" />
                        <span>{project._count.models} models</span>
                      </div>
                    </div>

                    {/* Dates */}
                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {project.startDate && formatDate(project.startDate)}
                        {project.startDate && project.endDate && ' - '}
                        {project.endDate && formatDate(project.endDate)}
                      </div>
                    )}

                    <Link href={`/project/${project.id}`}>
                      <Button className="w-full" size="sm">
                        Open Project
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}