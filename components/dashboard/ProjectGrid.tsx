"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Calendar, CheckCircle2, Box, Eye } from 'lucide-react'
import { formatDate, calculateProgress } from '@/lib/utils'
import CreateProjectDialog from '@/components/dashboard/CreateProjectDialog'

interface Model {
  id: number
  name: string | null
  source: string | null
}

interface Project {
  id: number
  name: string
  description?: string | null
  image?: string | null
  status?: string
  startDate?: Date | null
  endDate?: Date | null
  _count: { tasks: number; models: number }
  tasks: Array<{ progress: number }>
  models?: Model[]
}

interface ProjectGridProps {
  projects: Project[]
  userRole?: string
}

export default function ProjectGrid({ projects, userRole }: ProjectGridProps) {
  const [hoveredProject, setHoveredProject] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Projects</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{projects.length} projects</span>
          {(userRole === 'admin' || userRole === 'manager') && <CreateProjectDialog label="New Project" />}
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
              Get started by creating your first 4D BIM project
            </p>
            {(userRole === 'admin' || userRole === 'manager') && <CreateProjectDialog label="Create Project" />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = calculateProgress(project.tasks)
            const projectStatus = project.status || 'active'
            const statusColors: Record<string, string> = {
              planning: 'bg-yellow-500 text-white',
              active: 'bg-green-500 text-white',
              on_hold: 'bg-orange-500 text-white',
              completed: 'bg-blue-500 text-white',
            }
            const statusLabels: Record<string, string> = {
              planning: 'Planning',
              active: 'Active',
              on_hold: 'On Hold',
              completed: 'Completed',
            }
            const isHovered = hoveredProject === project.id

            return (
              <Card 
                key={project.id} 
                className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all overflow-hidden relative"
                onMouseEnter={() => setHoveredProject(project.id)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                {/* Project Image */}
                {project.image ? (
                  <div className="relative h-40 w-full">
                    <Image
                      src={project.image}
                      alt={project.name}
                      fill
                      className="object-cover"
                    />
                    <Badge className={`absolute top-2 right-2 ${statusColors[projectStatus] || 'bg-gray-500 text-white'} rounded-full px-3`}>
                      {statusLabels[projectStatus] || projectStatus}
                    </Badge>
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center relative">
                    <Building2 className="h-12 w-12 text-blue-300 dark:text-gray-600" />
                    <Badge className={`absolute top-2 right-2 ${statusColors[projectStatus] || 'bg-gray-500 text-white'} rounded-full px-3`}>
                      {statusLabels[projectStatus] || projectStatus}
                    </Badge>
                  </div>
                )}

                {/* Hover Overlay - Show Models */}
                {isHovered && project.models && project.models.length > 0 && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 z-10 animate-in fade-in duration-200">
                    <Box className="h-8 w-8 text-white mb-3" />
                    <h4 className="text-white font-semibold mb-3">3D Models ({project.models.length})</h4>
                    <div className="w-full max-h-32 overflow-y-auto space-y-2">
                      {project.models.slice(0, 5).map((model) => (
                        <div key={model.id} className="flex items-center gap-2 bg-white/10 rounded px-3 py-2">
                          <Box className="h-4 w-4 text-blue-400" />
                          <span className="text-white text-sm truncate">{model.name || `Model ${model.id}`}</span>
                          <span className="text-gray-400 text-xs ml-auto">{model.source || 'Unknown'}</span>
                        </div>
                      ))}
                      {project.models.length > 5 && (
                        <p className="text-gray-400 text-xs text-center">+{project.models.length - 5} more</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Link href={`/project/${project.id}?tab=models`}>
                        <Button size="sm" variant="secondary" className="gap-1">
                          <Eye className="h-4 w-4" />
                          View Models
                        </Button>
                      </Link>
                      <Link href={`/project/${project.id}`}>
                        <Button size="sm" className="gap-1">
                          Open Project
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* No Models Hover */}
                {isHovered && (!project.models || project.models.length === 0) && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 z-10 animate-in fade-in duration-200">
                    <Box className="h-8 w-8 text-gray-400 mb-3" />
                    <p className="text-gray-300 text-sm mb-4">No 3D models yet</p>
                    <Link href={`/project/${project.id}`}>
                      <Button size="sm">
                        Open Project
                      </Button>
                    </Link>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-gray-900 dark:text-white">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2 dark:text-gray-400">{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{project._count.tasks} tasks</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Box className="h-4 w-4" />
                        <span>{project._count.models} models</span>
                      </div>
                    </div>
                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {project.startDate && formatDate(project.startDate)}
                        {project.startDate && project.endDate && ' - '}
                        {project.endDate && formatDate(project.endDate)}
                      </div>
                    )}
                    <Link href={`/project/${project.id}`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700" size="sm">
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
