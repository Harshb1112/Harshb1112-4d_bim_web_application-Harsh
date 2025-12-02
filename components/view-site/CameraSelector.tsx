'use client'

import { useState } from 'react'
import { Camera, Plus, Settings, Wifi, WifiOff, Video, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CameraSelectorProps {
  cameras: any[]
  selectedCamera: any
  onCameraSelect: (camera: any) => void
  projectId: number
}

export default function CameraSelector({ 
  cameras, 
  selectedCamera, 
  onCameraSelect,
  projectId 
}: CameraSelectorProps) {
  const [isAddingCamera, setIsAddingCamera] = useState(false)
  const [newCamera, setNewCamera] = useState({
    name: '',
    cameraType: '360',
    brand: '',
    model: '',
    streamUrl: '',
    snapshotUrl: '',
    location: ''
  })

  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddCamera = async () => {
    if (!newCamera.name) {
      setAddError('Camera name is required')
      return
    }
    if (!newCamera.streamUrl) {
      setAddError('Stream URL is required')
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      const response = await fetch(`/api/site-view/${projectId}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCamera,
          brand: newCamera.brand || 'Hikvision'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsAddingCamera(false)
        setNewCamera({
          name: '',
          cameraType: 'fixed',
          brand: 'Hikvision',
          model: '',
          streamUrl: '',
          snapshotUrl: '',
          location: ''
        })
        // Refresh page to show new camera
        window.location.reload()
      } else {
        setAddError(data.error || 'Failed to add camera')
      }
    } catch (error) {
      console.error('Failed to add camera:', error)
      setAddError('Network error - please try again')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Camera List */}
      <div className="space-y-2">
        {cameras.length > 0 ? (
          cameras.map((camera) => (
            <Card 
              key={camera.id}
              className={`cursor-pointer transition-all ${
                selectedCamera?.id === camera.id 
                  ? 'bg-blue-600 border-blue-500' 
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
              }`}
              onClick={() => onCameraSelect(camera)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedCamera?.id === camera.id ? 'bg-blue-500' : 'bg-gray-600'
                    }`}>
                      {camera.cameraType === '360' ? (
                        <Video className="h-5 w-5 text-white" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{camera.name}</h4>
                      <p className="text-xs text-gray-400">
                        {camera.brand} {camera.model}
                      </p>
                      {camera.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {camera.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      variant="secondary" 
                      className={camera.isLive ? 'bg-green-600' : 'bg-gray-500'}
                    >
                      {camera.isLive ? (
                        <><Wifi className="h-3 w-3 mr-1" /> Live</>
                      ) : (
                        <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                      )}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {camera.cameraType}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cameras configured</p>
            <p className="text-sm mt-2">Add a 360° camera to start live streaming</p>
          </div>
        )}
      </div>

      {/* Add Camera Dialog */}
      <Dialog open={isAddingCamera} onOpenChange={setIsAddingCamera}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Camera
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add New Camera</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Camera Name</Label>
              <Input
                value={newCamera.name}
                onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                placeholder="e.g., Main Site Camera"
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label>Camera Type</Label>
              <Select 
                value={newCamera.cameraType}
                onValueChange={(v) => setNewCamera({ ...newCamera, cameraType: v })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="fixed">Fixed Camera (Bullet/Dome)</SelectItem>
                  <SelectItem value="ptz">PTZ Camera (Pan-Tilt-Zoom)</SelectItem>
                  <SelectItem value="360">360° Panoramic (PanoVu)</SelectItem>
                  <SelectItem value="fisheye">Fisheye Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select 
                  value={newCamera.brand}
                  onValueChange={(v) => setNewCamera({ ...newCamera, brand: v })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="Hikvision">Hikvision</SelectItem>
                    <SelectItem value="Dahua">Dahua</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={newCamera.model}
                  onChange={(e) => setNewCamera({ ...newCamera, model: e.target.value })}
                  placeholder="e.g., DS-2CD6986F-H"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stream URL (RTSP)</Label>
              <Input
                value={newCamera.streamUrl}
                onChange={(e) => setNewCamera({ ...newCamera, streamUrl: e.target.value })}
                placeholder="rtsp://admin:Admin@123@192.168.1.64:554/Streaming/Channels/101"
                className="bg-gray-700 border-gray-600 text-xs"
              />
              <p className="text-xs text-gray-500">
                <strong>Hikvision Example:</strong> rtsp://admin:password@IP:554/Streaming/Channels/101
              </p>
            </div>

            <div className="space-y-2">
              <Label>Snapshot URL (Optional)</Label>
              <Input
                value={newCamera.snapshotUrl}
                onChange={(e) => setNewCamera({ ...newCamera, snapshotUrl: e.target.value })}
                placeholder="http://camera-ip/snapshot"
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label>Location Description</Label>
              <Input
                value={newCamera.location}
                onChange={(e) => setNewCamera({ ...newCamera, location: e.target.value })}
                placeholder="e.g., North-East Corner, Floor 3"
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsAddingCamera(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleAddCamera}
                disabled={!newCamera.name}
              >
                Add Camera
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Setup Guide */}
      <Card className="bg-gray-700 border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Hikvision Camera Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400 space-y-3">
          {/* Login Example */}
          <div className="bg-gray-800 rounded p-2">
            <p className="text-gray-300 font-medium mb-1">📷 Example Login:</p>
            <div className="space-y-1 font-mono text-[10px]">
              <p>Web: <span className="text-blue-400">http://192.168.1.64</span></p>
              <p>Username: <span className="text-green-400">admin</span></p>
              <p>Password: <span className="text-yellow-400">Admin@123</span></p>
            </div>
          </div>

          {/* RTSP URL Example */}
          <div className="bg-gray-800 rounded p-2">
            <p className="text-gray-300 font-medium mb-1">🔗 RTSP Stream URL:</p>
            <code className="text-[9px] text-blue-300 break-all">
              rtsp://admin:Admin@123@192.168.1.64:554/Streaming/Channels/101
            </code>
          </div>

          {/* Channel Guide */}
          <div>
            <p className="text-gray-300 font-medium mb-1">📺 Channels:</p>
            <ul className="space-y-0.5 ml-2">
              <li>• Channel <span className="text-green-400">101</span> = Main Stream (HD)</li>
              <li>• Channel <span className="text-yellow-400">102</span> = Sub Stream</li>
              <li>• Channel <span className="text-blue-400">103</span> = Panoramic 360°</li>
            </ul>
          </div>

          {/* Steps */}
          <div>
            <p className="text-gray-300 font-medium mb-1">🔧 Setup Steps:</p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1">
              <li>Find camera IP (check NVR/router)</li>
              <li>Open browser: http://[IP]</li>
              <li>Login with admin credentials</li>
              <li>Copy RTSP URL and paste above</li>
            </ol>
          </div>

          {/* Software Links */}
          <div className="pt-2 border-t border-gray-600">
            <p className="text-gray-300 font-medium mb-1">📱 Hikvision Software:</p>
            <ul className="space-y-0.5 ml-2 text-[10px]">
              <li>• iVMS-4200 (PC Software)</li>
              <li>• Hik-Connect (Mobile App)</li>
              <li>• SADP Tool (Find Camera IP)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
