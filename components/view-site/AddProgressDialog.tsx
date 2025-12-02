'use client'

import { useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface AddProgressDialogProps {
  projectId: number
  onProgressAdded?: () => void
}

export default function AddProgressDialog({ projectId, onProgressAdded }: AddProgressDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({
    date: new Date().toISOString().split('T')[0],
    workDescription: '',
    teamName: '',
    workersCount: '',
    hoursWorked: '8',
    progressPercent: '',
    weather: '',
    issues: '',
    notes: ''
  })

  const handleSubmit = async () => {
    if (!progress.workDescription) {
      toast.error('Please describe the work done')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/site-view/${projectId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...progress,
          workersCount: progress.workersCount ? parseInt(progress.workersCount) : null,
          hoursWorked: progress.hoursWorked ? parseFloat(progress.hoursWorked) : null,
          progressPercent: progress.progressPercent ? parseFloat(progress.progressPercent) : null
        })
      })

      if (response.ok) {
        toast.success('Progress entry added')
        setOpen(false)
        setProgress({
          date: new Date().toISOString().split('T')[0],
          workDescription: '',
          teamName: '',
          workersCount: '',
          hoursWorked: '8',
          progressPercent: '',
          weather: '',
          issues: '',
          notes: ''
        })
        onProgressAdded?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to add progress')
      }
    } catch (error) {
      toast.error('Failed to add progress entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Log Daily Progress
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Log Daily Progress
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={progress.date}
              onChange={(e) => setProgress({ ...progress, date: e.target.value })}
              className="bg-gray-700 border-gray-600"
            />
          </div>

          <div className="space-y-2">
            <Label>Work Description *</Label>
            <Textarea
              value={progress.workDescription}
              onChange={(e) => setProgress({ ...progress, workDescription: e.target.value })}
              placeholder="Describe the work completed today..."
              className="bg-gray-700 border-gray-600"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input
                value={progress.teamName}
                onChange={(e) => setProgress({ ...progress, teamName: e.target.value })}
                placeholder="e.g., Team A"
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Workers Count</Label>
              <Input
                type="number"
                value={progress.workersCount}
                onChange={(e) => setProgress({ ...progress, workersCount: e.target.value })}
                placeholder="15"
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hours Worked</Label>
              <Input
                type="number"
                step="0.5"
                value={progress.hoursWorked}
                onChange={(e) => setProgress({ ...progress, hoursWorked: e.target.value })}
                placeholder="8"
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Progress %</Label>
              <Input
                type="number"
                step="0.1"
                value={progress.progressPercent}
                onChange={(e) => setProgress({ ...progress, progressPercent: e.target.value })}
                placeholder="2.5"
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Weather</Label>
            <Select 
              value={progress.weather}
              onValueChange={(v) => setProgress({ ...progress, weather: v })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select weather" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="sunny">☀️ Sunny</SelectItem>
                <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                <SelectItem value="overcast">🌥️ Overcast</SelectItem>
                <SelectItem value="hot">🔥 Hot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Issues / Delays</Label>
            <Textarea
              value={progress.issues}
              onChange={(e) => setProgress({ ...progress, issues: e.target.value })}
              placeholder="Any issues or delays faced..."
              className="bg-gray-700 border-gray-600"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={progress.notes}
              onChange={(e) => setProgress({ ...progress, notes: e.target.value })}
              placeholder="Any other observations..."
              className="bg-gray-700 border-gray-600"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={loading || !progress.workDescription}
            >
              {loading ? 'Adding...' : 'Log Progress'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
