'use client'

import { useState } from 'react'
import { Upload, Camera, Video, Image, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface AddCaptureDialogProps {
  projectId: number
  cameras: any[]
  onCaptureAdded?: () => void
}

export default function AddCaptureDialog({ projectId, cameras, onCaptureAdded }: AddCaptureDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [capture, setCapture] = useState({
    cameraId: '',
    captureType: '360_photo',
    url: '',
    thumbnailUrl: '',
    capturedAt: new Date().toISOString().slice(0, 16),
    weather: '',
    temperature: '',
    notes: ''
  })

  const handleSubmit = async () => {
    if (!capture.url) {
      toast.error('Please provide a capture URL')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/site-view/${projectId}/captures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...capture,
          cameraId: capture.cameraId ? parseInt(capture.cameraId) : null,
          temperature: capture.temperature ? parseFloat(capture.temperature) : null,
          capturedAt: new Date(capture.capturedAt).toISOString()
        })
      })

      if (response.ok) {
        toast.success('Capture added successfully')
        setOpen(false)
        setCapture({
          cameraId: '',
          captureType: '360_photo',
          url: '',
          thumbnailUrl: '',
          capturedAt: new Date().toISOString().slice(0, 16),
          weather: '',
          temperature: '',
          notes: ''
        })
        onCaptureAdded?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to add capture')
      }
    } catch (error) {
      toast.error('Failed to add capture')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Add Capture
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Site Capture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Capture Type</Label>
            <Select 
              value={capture.captureType}
              onValueChange={(v) => setCapture({ ...capture, captureType: v })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="360_photo">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" /> 360° Photo
                  </div>
                </SelectItem>
                <SelectItem value="360_video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" /> 360° Video
                  </div>
                </SelectItem>
                <SelectItem value="photo">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Standard Photo
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" /> Standard Video
                  </div>
                </SelectItem>
                <SelectItem value="drone">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" /> Drone Capture
                  </div>
                </SelectItem>
                <SelectItem value="timelapse">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" /> Timelapse
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {cameras.length > 0 && (
            <div className="space-y-2">
              <Label>Camera (Optional)</Label>
              <Select 
                value={capture.cameraId}
                onValueChange={(v) => setCapture({ ...capture, cameraId: v })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {cameras.map((cam) => (
                    <SelectItem key={cam.id} value={cam.id.toString()}>
                      {cam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Capture URL *</Label>
            <Input
              value={capture.url}
              onChange={(e) => setCapture({ ...capture, url: e.target.value })}
              placeholder="https://storage.example.com/capture.jpg"
              className="bg-gray-700 border-gray-600"
            />
            <p className="text-xs text-gray-500">
              URL to the 360° image or video file (S3, GCS, or any public URL)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Thumbnail URL (Optional)</Label>
            <Input
              value={capture.thumbnailUrl}
              onChange={(e) => setCapture({ ...capture, thumbnailUrl: e.target.value })}
              placeholder="https://storage.example.com/thumb.jpg"
              className="bg-gray-700 border-gray-600"
            />
          </div>

          <div className="space-y-2">
            <Label>Captured At</Label>
            <Input
              type="datetime-local"
              value={capture.capturedAt}
              onChange={(e) => setCapture({ ...capture, capturedAt: e.target.value })}
              className="bg-gray-700 border-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weather</Label>
              <Select 
                value={capture.weather}
                onValueChange={(v) => setCapture({ ...capture, weather: v })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="sunny">☀️ Sunny</SelectItem>
                  <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                  <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                  <SelectItem value="overcast">🌥️ Overcast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Temperature (°C)</Label>
              <Input
                type="number"
                value={capture.temperature}
                onChange={(e) => setCapture({ ...capture, temperature: e.target.value })}
                placeholder="32"
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={capture.notes}
              onChange={(e) => setCapture({ ...capture, notes: e.target.value })}
              placeholder="Any observations about the site..."
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
              disabled={loading || !capture.url}
            >
              {loading ? 'Adding...' : 'Add Capture'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
