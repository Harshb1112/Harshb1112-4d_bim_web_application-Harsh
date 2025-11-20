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
import { Settings, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface ProjectSettingsDialogProps {
  project: any
  onProjectUpdate: (updatedProject: any) => void
}

export default function ProjectSettingsDialog({ project, onProjectUpdate }: ProjectSettingsDialogProps) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [startDate, setStartDate] = useState(project.startDate ? project.startDate.split('T')[0] : '')
  const [endDate, setEndDate] = useState(project.endDate ? project.endDate.split('T')[0] : '')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setStartDate(project.startDate ? project.startDate.split('T')[0] : '')
      setEndDate(project.endDate ? project.endDate.split('T')[0] : '')
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
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            description,
            startDate: startDate || null,
            endDate: endDate || null,
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}