/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Settings, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface ProjectSettingsDialogProps {
  project: any
  onProjectUpdate: (updatedProject: any) => void
  userRole?: string
}

export default function ProjectSettingsDialog({ project, onProjectUpdate, userRole }: ProjectSettingsDialogProps) {
  const router = useRouter()
  const canDelete = userRole === 'admin' || userRole === 'manager'
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [startDate, setStartDate] = useState(project.startDate ? project.startDate.split('T')[0] : '')
  const [endDate, setEndDate] = useState(project.endDate ? project.endDate.split('T')[0] : '')
  const [budget, setBudget] = useState(project.budget || 0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setStartDate(project.startDate ? project.startDate.split('T')[0] : '')
      setEndDate(project.endDate ? project.endDate.split('T')[0] : '')
      setBudget(project.budget || 0)
    }
  }, [project])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const promise = new Promise(async (resolve, reject) => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0]
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            name,
            description,
            startDate: startDate || null,
            endDate: endDate || null,
            budget: parseFloat(budget.toString()) || 0,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update project')
        }

        onProjectUpdate(data.project)
        setIsOpen(false)
        resolve(data.message)
      } catch (error) {
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: 'Saving project settings...',
      success: (message) => `${message}`,
      error: (err) => `Failed to save settings: ${err.message}`,
    })
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== project.name) {
      toast.error('Project name does not match')
      return
    }

    setDeleting(true)
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete project')
        }

        // Redirect to dashboard after successful deletion
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
        
        resolve(data.message)
      } catch (error) {
        reject(error)
      } finally {
        setDeleting(false)
      }
    })

    toast.promise(promise, {
      loading: 'Deleting project...',
      success: (message) => `${message}`,
      error: (err) => `Failed to delete project: ${err.message}`,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild suppressHydrationWarning>
        <Button variant="outline" size="sm" suppressHydrationWarning>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" suppressHydrationWarning>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Project Settings</span>
          </DialogTitle>
          <DialogDescription>
            Make changes to your project details here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Project Budget (₹)</Label>
            <Input
              id="budget"
              type="number"
              min="0"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
              placeholder="Enter total project budget"
            />
            <p className="text-xs text-muted-foreground">
              Set the total budget for this project to track spending
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center">
            {canDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold">Delete Project</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                This action cannot be undone. This will permanently delete the project, 
                all tasks, models, and associated data.
              </p>

              <div className="mb-4">
                <Label htmlFor="confirmDelete" className="text-sm font-medium">
                  Type <span className="font-bold">{project.name}</span> to confirm:
                </Label>
                <Input
                  id="confirmDelete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter project name"
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirmText !== project.name}
                >
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {deleting ? 'Deleting...' : 'Delete Project'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}