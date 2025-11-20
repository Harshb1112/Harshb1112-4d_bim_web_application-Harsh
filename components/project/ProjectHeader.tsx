/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, Calendar, Settings } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ProjectSettingsDialog from './ProjectSettingsDialog' // Import the new dialog

interface ProjectHeaderProps {
  project: {
    id: number
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
    projectUsers: Array<{
      user: {
        fullName: string
        email: string
        role: string
      }
    }>
  }
  user: {
    id: number
    fullName: string
    email: string
    role: string
  }
}

export default function ProjectHeader({ project, user }: ProjectHeaderProps) {
  const router = useRouter()
  const [currentProject, setCurrentProject] = useState(project)

  const handleProjectUpdate = (updatedProject: any) => {
    setCurrentProject(prev => ({ ...prev, ...updatedProject }))
    // Optionally, re-fetch full project data or update local state more deeply if needed
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 border-l border-gray-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentProject.name}
                </h1>
                {currentProject.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {currentProject.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ProjectSettingsDialog project={currentProject} onProjectUpdate={handleProjectUpdate} />
            </div>
          </div>

          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
            {(currentProject.startDate || currentProject.endDate) && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {currentProject.startDate && formatDate(currentProject.startDate)}
                  {currentProject.startDate && currentProject.endDate && ' - '}
                  {currentProject.endDate && formatDate(currentProject.endDate)}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{currentProject.projectUsers.length} team members</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}