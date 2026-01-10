'use client';

import { ArrowLeft, Users, Calendar, Pencil, Trash2, Loader2, AlertTriangle, Video, Shield, Camera, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProjectHeaderProps {
  project: any;
  user?: any;
}

export default function ProjectHeader({ project, user }: ProjectHeaderProps) {
  const router = useRouter();
  const [currentProject, setCurrentProject] = useState(project);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewSiteOpen, setViewSiteOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [startDate, setStartDate] = useState(project.startDate ? project.startDate.split('T')[0] : '');
  const [endDate, setEndDate] = useState(project.endDate ? project.endDate.split('T')[0] : '');
  const [loading, setLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'team_leader';
  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  if (!currentProject) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'on_hold': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description, startDate: startDate || null, endDate: endDate || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCurrentProject(data.project);
      setEditOpen(false);
      toast.success('Project updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== currentProject.name) {
      toast.error('Project name does not match');
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success('Project deleted');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>

          <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentProject.name}
              </h1>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} className="h-7 w-7 p-0">
                  <Pencil className="w-4 h-4 text-gray-500" />
                </Button>
              )}
              <Badge className={getStatusColor(currentProject.status)}>
                {currentProject.status}
              </Badge>
            </div>
            {currentProject.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {currentProject.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400" suppressHydrationWarning>
                {currentProject.startDate && currentProject.endDate 
                  ? `${new Date(currentProject.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(currentProject.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  : 'Set dates in edit'}
              </span>
            </div>
            {currentProject.startDate && currentProject.endDate && (() => {
              const start = new Date(currentProject.startDate);
              const end = new Date(currentProject.endDate);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const years = Math.floor(diffDays / 365);
              const months = Math.floor((diffDays % 365) / 30);
              
              let durationText = '';
              if (years > 0 && months > 0) {
                durationText = `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
              } else if (years > 0) {
                durationText = `${years} year${years > 1 ? 's' : ''}`;
              } else if (months > 0) {
                durationText = `${months} month${months > 1 ? 's' : ''}`;
              } else {
                durationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
              }
              
              return (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  Duration: {durationText}
                </Badge>
              );
            })()}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                {currentProject.team?.name || 'No Team'}
              </span>
            </div>
          </div>

          {/* View Site Button - Opens confirmation dialog */}
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setViewSiteOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Video className="w-4 h-4 mr-2" />
            View Site (LIVE)
          </Button>

          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project name and description</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All tasks, models, and data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              Type <span className="font-bold">{currentProject.name}</span> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || deleteConfirmText !== currentProject.name}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Site Confirmation Dialog */}
      <Dialog open={viewSiteOpen} onOpenChange={setViewSiteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-center text-xl">
              View Live Site
            </DialogTitle>
            <DialogDescription className="text-center">
              Access the live 360° camera feed for this construction site
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Security Notice */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Secure Access</p>
                <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                  You must be logged in to view the live site. All access is logged for security purposes.
                </p>
              </div>
            </div>

            {/* Project Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Project:</p>
              <p className="font-medium text-gray-900 dark:text-white">{currentProject.name}</p>
              {currentProject.location && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentProject.location}</p>
              )}
            </div>

            {/* Features */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-2">You will be able to:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  View live 360° camera feed (Hikvision)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  See historical timelapse recordings
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Track daily costs and progress
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  View upcoming construction tasks
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => setViewSiteOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setViewSiteOpen(false);
                router.push(`/project/${project.id}/view-site`);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Sign In & View Site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
