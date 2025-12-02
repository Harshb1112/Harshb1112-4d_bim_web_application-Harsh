'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, AlertCircle, RefreshCw, Settings, ExternalLink, Play, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Viewer360Props {
  camera: any
  capture: any
  viewMode: 'live' | 'timelapse' | '3d'
  isLive: boolean
  projectId?: number
}

interface HikDevice {
  deviceSerial: string
  deviceName: string
  deviceType: string
  status: 'online' | 'offline'
  channelNo: number
}

export default function Viewer360({ camera, capture, viewMode, isLive, projectId }: Viewer360Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hikConfigured, setHikConfigured] = useState<boolean | null>(null)
  const [hikDevices, setHikDevices] = useState<HikDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<HikDevice | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loadingStream, setLoadingStream] = useState(false)

  // Check if Hikvision API is configured and fetch devices
  const checkHikvisionSetup = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First check if API is configured
      const authResponse = await fetch('/api/hikvision/auth')
      const authData = await authResponse.json()

      if (!authResponse.ok) {
        setHikConfigured(false)
        setError(authData.message || 'Hikvision API not configured')
        setIsLoading(false)
        return
      }

      setHikConfigured(true)

      // Fetch devices
      const devicesResponse = await fetch('/api/hikvision/devices')
      const devicesData = await devicesResponse.json()

      if (devicesResponse.ok && devicesData.devices) {
        setHikDevices(devicesData.devices)
        if (devicesData.devices.length > 0) {
          setSelectedDevice(devicesData.devices[0])
        }
      } else {
        setError(devicesData.error || 'No devices found')
      }
    } catch (err) {
      console.error('Hikvision setup check failed:', err)
      setError('Failed to connect to Hikvision')
      setHikConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkHikvisionSetup()
  }, [checkHikvisionSetup])

  // Get stream URL for selected device
  const getStreamUrl = async (device: HikDevice) => {
    setLoadingStream(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hikvision/stream?deviceSerial=${device.deviceSerial}&channelNo=${device.channelNo}`
      )
      const data = await response.json()

      if (response.ok && data.streamUrl) {
        setStreamUrl(data.streamUrl)
        // Load HLS stream
        loadHlsStream(data.streamUrl)
      } else {
        setError(data.error || 'Failed to get stream URL')
      }
    } catch (err) {
      setError('Failed to get stream')
    } finally {
      setLoadingStream(false)
    }
  }

  // Load HLS stream using hls.js
  const loadHlsStream = async (url: string) => {
    if (!videoRef.current) return

    const video = videoRef.current

    try {
      const Hls = (await import('hls.js')).default

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        })
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(console.error)
        })
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data)
          if (data.fatal) {
            setError('Stream playback error')
          }
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
        video.play().catch(console.error)
      } else {
        setError('HLS not supported in this browser')
      }
    } catch (err) {
      console.error('Failed to load HLS:', err)
      // Fallback to direct video
      video.src = url
      video.play().catch(console.error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Connecting to Hikvision...</p>
          <p className="text-gray-400 text-sm mt-1">Checking API configuration</p>
        </div>
      </div>
    )
  }

  // Hikvision not configured - show setup guide
  if (hikConfigured === false) {
    return (
      <div className="relative w-full h-full bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center">
              <Settings className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Setup Hikvision API</h2>
            <p className="text-gray-400 text-sm mt-1">
              Connect your Hik-Connect account to view cameras
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <h3 className="text-white font-medium">Setup Steps:</h3>
            
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                <div>
                  <p className="text-gray-300">Go to Hikvision Open Platform</p>
                  <a 
                    href="https://open.hikvision.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs hover:underline inline-flex items-center gap-1"
                  >
                    open.hikvision.com <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                <div>
                  <p className="text-gray-300">Login with your Hik-Connect account</p>
                  <p className="text-gray-500 text-xs">Same account as Hik-Connect app</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                <div>
                  <p className="text-gray-300">Create an Application</p>
                  <p className="text-gray-500 text-xs">Get App Key and App Secret</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">4</span>
                <div>
                  <p className="text-gray-300">Add to .env file:</p>
                  <code className="text-xs text-green-400 bg-gray-900 px-2 py-1 rounded block mt-1">
                    HIKVISION_APP_KEY=your_key<br/>
                    HIKVISION_APP_SECRET=your_secret
                  </code>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">5</span>
                <div>
                  <p className="text-gray-300">Restart the server</p>
                  <p className="text-gray-500 text-xs">npm run dev</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open('https://open.hikvision.com/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Hikvision
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={checkHikvisionSetup}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // No devices found
  if (hikDevices.length === 0) {
    return (
      <div className="relative w-full h-full bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Cameras Found</h2>
          <p className="text-gray-400 mb-4">
            No cameras are linked to your Hik-Connect account. 
            Add cameras using the Hik-Connect mobile app first.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => window.open('https://www.hik-connect.com/', '_blank')}
            >
              Open Hik-Connect
            </Button>
            <Button onClick={checkHikvisionSetup}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show device list and stream
  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Player */}
      {streamUrl ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          autoPlay
          muted
          playsInline
          controls
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {/* Device Selection */}
          <div className="max-w-md w-full p-4">
            <div className="text-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-white">Hikvision Connected!</h2>
              <p className="text-gray-400 text-sm">Select a camera to view live feed</p>
            </div>

            <div className="space-y-2">
              {hikDevices.map((device) => (
                <Card
                  key={device.deviceSerial}
                  className={`cursor-pointer transition-all ${
                    selectedDevice?.deviceSerial === device.deviceSerial
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedDevice(device)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Camera className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-white">{device.deviceName}</p>
                          <p className="text-xs text-gray-400">{device.deviceSerial}</p>
                        </div>
                      </div>
                      <Badge className={device.status === 'online' ? 'bg-green-600' : 'bg-gray-600'}>
                        {device.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedDevice && (
              <Button
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => getStreamUrl(selectedDevice)}
                disabled={loadingStream || selectedDevice.status !== 'online'}
              >
                {loadingStream ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    View Live Feed
                  </>
                )}
              </Button>
            )}

            {error && (
              <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay when streaming */}
      {streamUrl && (
        <>
          {/* Camera Info */}
          <div className="absolute top-4 left-4 bg-black/70 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-white">{selectedDevice?.deviceName}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">{selectedDevice?.deviceSerial}</div>
          </div>

          {/* Live Badge */}
          <div className="absolute top-4 right-4">
            <div className="bg-red-600 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="text-white text-sm font-medium">LIVE</span>
            </div>
          </div>

          {/* Back Button */}
          <div className="absolute bottom-4 left-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStreamUrl(null)}
              className="bg-black/70"
            >
              ← Back to Cameras
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
