/**
 * Camera Stream Utilities
 * 
 * Handles WebRTC/RTSP streaming for 360° cameras like:
 * - RICOH THETA X/Z1
 * - Insta360 Pro/Pro2
 * - GoPro MAX
 * - Matterport cameras
 */

export interface CameraConfig {
  id: number
  name: string
  streamUrl: string
  snapshotUrl?: string
  cameraType: '360' | 'fixed' | 'drone' | 'ptz'
  brand?: string
  apiKey?: string
  apiSecret?: string
}

export interface StreamOptions {
  quality?: 'low' | 'medium' | 'high' | '4k'
  autoReconnect?: boolean
  reconnectInterval?: number
}

/**
 * WebRTC Stream Manager
 * Handles connection to camera streams via WebRTC
 */
export class WebRTCStreamManager {
  private peerConnection: RTCPeerConnection | null = null
  private mediaStream: MediaStream | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnected = false

  constructor(
    private config: CameraConfig,
    private options: StreamOptions = {}
  ) {
    this.options = {
      quality: 'high',
      autoReconnect: true,
      reconnectInterval: 5000,
      ...options
    }
  }

  /**
   * Connect to camera stream
   */
  async connect(): Promise<MediaStream> {
    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      // Handle incoming tracks
      this.peerConnection.ontrack = (event) => {
        this.mediaStream = event.streams[0]
      }

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState
        console.log(`WebRTC connection state: ${state}`)
        
        if (state === 'connected') {
          this.isConnected = true
        } else if (state === 'disconnected' || state === 'failed') {
          this.isConnected = false
          if (this.options.autoReconnect) {
            this.scheduleReconnect()
          }
        }
      }

      // For RICOH THETA cameras
      if (this.config.brand === 'RICOH') {
        return await this.connectRicohTheta()
      }

      // For Insta360 cameras
      if (this.config.brand === 'Insta360') {
        return await this.connectInsta360()
      }

      // Generic WebRTC connection
      return await this.connectGenericWebRTC()
    } catch (error) {
      console.error('Failed to connect to camera:', error)
      throw error
    }
  }

  /**
   * Connect to RICOH THETA camera
   * THETA X/Z1 support WebRTC streaming
   */
  private async connectRicohTheta(): Promise<MediaStream> {
    // RICOH THETA WebRTC signaling
    const signalingUrl = this.config.streamUrl.replace('ws://', 'http://').replace('/stream', '/api/signaling')
    
    // Create offer
    const offer = await this.peerConnection!.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    })
    await this.peerConnection!.setLocalDescription(offer)

    // Send offer to camera
    const response = await fetch(signalingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sdp: offer.sdp,
        type: offer.type
      })
    })

    const answer = await response.json()
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer))

    // Wait for stream
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stream connection timeout'))
      }, 10000)

      this.peerConnection!.ontrack = (event) => {
        clearTimeout(timeout)
        this.mediaStream = event.streams[0]
        resolve(this.mediaStream)
      }
    })
  }

  /**
   * Connect to Insta360 camera
   */
  private async connectInsta360(): Promise<MediaStream> {
    // Insta360 uses RTSP, need to convert via server
    // This would typically go through a media server like Janus or mediasoup
    console.log('Insta360 connection - requires RTSP to WebRTC gateway')
    return this.connectGenericWebRTC()
  }

  /**
   * Generic WebRTC connection
   */
  private async connectGenericWebRTC(): Promise<MediaStream> {
    // For demo/testing, create a placeholder stream
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 960
    const ctx = canvas.getContext('2d')!
    
    // Draw placeholder
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Connecting to camera...', canvas.width / 2, canvas.height / 2)
    ctx.font = '24px Arial'
    ctx.fillText(this.config.name, canvas.width / 2, canvas.height / 2 + 50)

    // @ts-ignore - captureStream exists on canvas
    this.mediaStream = canvas.captureStream(30)
    return this.mediaStream
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = setTimeout(async () => {
      console.log('Attempting to reconnect to camera...')
      try {
        await this.connect()
      } catch (error) {
        console.error('Reconnection failed:', error)
        this.scheduleReconnect()
      }
    }, this.options.reconnectInterval)
  }

  /**
   * Get current stream
   */
  getStream(): MediaStream | null {
    return this.mediaStream
  }

  /**
   * Check if connected
   */
  isStreamConnected(): boolean {
    return this.isConnected
  }

  /**
   * Disconnect from camera
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    this.isConnected = false
  }
}

/**
 * Snapshot Manager
 * For cameras that support periodic snapshot capture
 */
export class SnapshotManager {
  private intervalId: NodeJS.Timeout | null = null
  private lastSnapshot: string | null = null

  constructor(
    private config: CameraConfig,
    private onSnapshot?: (url: string) => void
  ) {}

  /**
   * Start capturing snapshots
   */
  startCapture(intervalMs: number = 5000) {
    this.intervalId = setInterval(async () => {
      try {
        const snapshot = await this.captureSnapshot()
        if (snapshot && this.onSnapshot) {
          this.onSnapshot(snapshot)
        }
      } catch (error) {
        console.error('Snapshot capture failed:', error)
      }
    }, intervalMs)
  }

  /**
   * Capture a single snapshot
   */
  async captureSnapshot(): Promise<string | null> {
    if (!this.config.snapshotUrl) {
      return null
    }

    try {
      // For RICOH THETA
      if (this.config.brand === 'RICOH') {
        const response = await fetch(this.config.snapshotUrl, {
          headers: this.config.apiKey ? {
            'Authorization': `Bearer ${this.config.apiKey}`
          } : {}
        })
        
        if (response.ok) {
          const blob = await response.blob()
          this.lastSnapshot = URL.createObjectURL(blob)
          return this.lastSnapshot
        }
      }

      // Generic snapshot
      const response = await fetch(this.config.snapshotUrl)
      if (response.ok) {
        const blob = await response.blob()
        this.lastSnapshot = URL.createObjectURL(blob)
        return this.lastSnapshot
      }
    } catch (error) {
      console.error('Failed to capture snapshot:', error)
    }

    return null
  }

  /**
   * Get last captured snapshot
   */
  getLastSnapshot(): string | null {
    return this.lastSnapshot
  }

  /**
   * Stop capturing
   */
  stopCapture() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}

/**
 * RTSP to WebRTC Gateway Helper
 * For cameras that only support RTSP streaming
 */
export function getRTSPGatewayUrl(rtspUrl: string, gatewayHost: string = 'localhost:8080'): string {
  // Convert RTSP URL to WebRTC gateway URL
  // This assumes you have a Janus/mediasoup gateway running
  const encodedUrl = encodeURIComponent(rtspUrl)
  return `ws://${gatewayHost}/stream?url=${encodedUrl}`
}

/**
 * Camera brand-specific helpers
 */
export const CameraHelpers = {
  /**
   * Get Hikvision RTSP stream URL
   * Hikvision cameras use standard RTSP protocol
   * Channel 101 = Main stream, 102 = Sub stream, 103 = Panoramic (for 360° cameras)
   */
  getHikvisionStreamUrl(cameraIp: string, username: string = 'admin', password: string = '', channel: number = 101): string {
    const auth = password ? `${username}:${password}@` : `${username}@`
    return `rtsp://${auth}${cameraIp}:554/Streaming/Channels/${channel}`
  },

  /**
   * Get Hikvision panoramic stream (for PanoVu 360° cameras)
   */
  getHikvisionPanoramicUrl(cameraIp: string, username: string = 'admin', password: string = ''): string {
    return CameraHelpers.getHikvisionStreamUrl(cameraIp, username, password, 103)
  },

  /**
   * Get Hikvision snapshot URL
   */
  getHikvisionSnapshotUrl(cameraIp: string, username: string = 'admin', password: string = '', channel: number = 101): string {
    const auth = password ? `${username}:${password}@` : `${username}@`
    return `http://${auth}${cameraIp}/ISAPI/Streaming/channels/${channel}/picture`
  },

  /**
   * Get RICOH THETA stream URL
   */
  getRicohThetaStreamUrl(cameraIp: string): string {
    return `ws://${cameraIp}:8080/stream`
  },

  /**
   * Get RICOH THETA snapshot URL
   */
  getRicohThetaSnapshotUrl(cameraIp: string): string {
    return `http://${cameraIp}/osc/commands/execute`
  },

  /**
   * Get Insta360 RTSP URL
   */
  getInsta360RtspUrl(cameraIp: string): string {
    return `rtsp://${cameraIp}:554/live`
  },

  /**
   * Get Dahua RTSP URL
   */
  getDahuaStreamUrl(cameraIp: string, username: string = 'admin', password: string = '', channel: number = 1): string {
    const auth = password ? `${username}:${password}@` : `${username}@`
    return `rtsp://${auth}${cameraIp}:554/cam/realmonitor?channel=${channel}&subtype=0`
  },

  /**
   * Get generic RTSP URL
   */
  getGenericRtspUrl(cameraIp: string, port: number = 554, path: string = '/stream'): string {
    return `rtsp://${cameraIp}:${port}${path}`
  }
}

/**
 * Hikvision specific stream manager
 * Handles RTSP to browser conversion for Hikvision cameras
 */
export class HikvisionStreamManager {
  private cameraIp: string
  private username: string
  private password: string
  private channel: number

  constructor(cameraIp: string, username: string = 'admin', password: string = '', channel: number = 101) {
    this.cameraIp = cameraIp
    this.username = username
    this.password = password
    this.channel = channel
  }

  /**
   * Get RTSP URL for the camera
   */
  getRtspUrl(): string {
    return CameraHelpers.getHikvisionStreamUrl(this.cameraIp, this.username, this.password, this.channel)
  }

  /**
   * Get snapshot URL
   */
  getSnapshotUrl(): string {
    return CameraHelpers.getHikvisionSnapshotUrl(this.cameraIp, this.username, this.password, this.channel)
  }

  /**
   * Capture a snapshot from the camera
   * Note: This requires a backend proxy due to CORS
   */
  async captureSnapshot(): Promise<Blob | null> {
    try {
      // In production, this should go through your backend to avoid CORS
      const response = await fetch(`/api/camera-proxy/snapshot?ip=${this.cameraIp}&channel=${this.channel}`)
      if (response.ok) {
        return await response.blob()
      }
    } catch (error) {
      console.error('Failed to capture Hikvision snapshot:', error)
    }
    return null
  }

  /**
   * Get WebRTC stream URL (requires RTSP to WebRTC gateway)
   * You need to set up a media server like:
   * - go2rtc (recommended for Hikvision)
   * - mediamtx
   * - Janus Gateway
   */
  getWebRtcUrl(gatewayHost: string = 'localhost:8554'): string {
    // go2rtc format
    return `http://${gatewayHost}/api/ws?src=${encodeURIComponent(this.getRtspUrl())}`
  }
}
