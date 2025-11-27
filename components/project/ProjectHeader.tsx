'use client';

import { ArrowLeft, Users, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProjectSettingsDialog from './ProjectSettingsDialog';
import { useState } from 'react';

interface ProjectHeaderProps {
  project: any;
  user?: any;
}

export default function ProjectHeader({ project, user }: ProjectHeaderProps) {
  const router = useRouter();
  const [currentProject, setCurrentProject] = useState(project);

  if (!currentProject) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'on_hold': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="h-8 w-px bg-gray-300" />

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentProject.name}
              </h1>
              <Badge className={getStatusColor(currentProject.status)}>
                {currentProject.status}
              </Badge>
            </div>
            {currentProject.description && (
              <p className="text-sm text-gray-600 mt-1">
                {currentProject.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Project Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600" suppressHydrationWarning>
                {new Date(currentProject.startDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })} - {new Date(currentProject.endDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {currentProject.team?.name || 'No Team'}
              </span>
            </div>
          </div>

          <ProjectSettingsDialog 
            project={currentProject} 
            onProjectUpdate={setCurrentProject}
            userRole={user?.role}
          />
        </div>
      </div>
    </div>
  );
}
