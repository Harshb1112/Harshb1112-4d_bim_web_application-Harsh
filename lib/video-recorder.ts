export interface RecordingOptions {
  format?: 'webm' | 'mp4'
  quality?: 'hd' | 'fullhd' | '4k'
  fps?: 30 | 60
  bitrate?: number
  includeOverlay?: boolean
  overlayData?: {
    projectName?: string
    date?: string
    progress?: string
    taskName?: string
    completedTasks?: string
    totalCost?: string
    customText?: string
  }
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private stream: MediaStream | null = null
  private canvas: HTMLCanvasElement
  private overlayCanvas: HTMLCanvasElement | null = null
  private overlayContext: CanvasRenderingContext2D | null = null
  private animationFrameId: number | null = null
  private options: RecordingOptions

  constructor(canvas: HTMLCanvasElement, options: RecordingOptions = {}) {
    this.canvas = canvas
    this.options = {
      format: options.format || 'webm',
      quality: options.quality || 'fullhd',
      fps: options.fps || 60,
      bitrate: options.bitrate || 10000000, // 10 Mbps for Full HD
      includeOverlay: options.includeOverlay !== false,
      overlayData: options.overlayData || {}
    }
  }

  private getQualitySettings() {
    const qualities = {
      hd: { width: 1280, height: 720, bitrate: 8000000 },      // 8 Mbps
      fullhd: { width: 1920, height: 1080, bitrate: 20000000 }, // 20 Mbps (doubled)
      '4k': { width: 3840, height: 2160, bitrate: 50000000 }    // 50 Mbps (doubled)
    }
    return qualities[this.options.quality || 'fullhd']
  }

  private setupOverlayCanvas() {
    const quality = this.getQualitySettings()
    
    // Create overlay canvas for text
    this.overlayCanvas = document.createElement('canvas')
    this.overlayCanvas.width = quality.width
    this.overlayCanvas.height = quality.height
    this.overlayContext = this.overlayCanvas.getContext('2d')
  }

  private drawOverlay() {
    if (!this.overlayContext || !this.overlayCanvas) return

    const ctx = this.overlayContext
    const width = this.overlayCanvas.width
    const height = this.overlayCanvas.height

    // Clear previous frame
    ctx.clearRect(0, 0, width, height)

    // Draw original canvas content (scaled to target resolution with high quality)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(this.canvas, 0, 0, width, height)

    if (this.options.includeOverlay && this.options.overlayData) {
      const data = this.options.overlayData
      const scale = width / 1920 // Scale factor for different resolutions

      // Main Info Panel - Top Left
      const panelWidth = 500 * scale
      const panelHeight = 280 * scale
      const padding = 20 * scale
      const innerPadding = 15 * scale

      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(padding, padding, panelWidth, panelHeight)

      // Border
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)' // Blue border
      ctx.lineWidth = 3 * scale
      ctx.strokeRect(padding, padding, panelWidth, panelHeight)

      // Text styling
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'

      let yPos = padding + innerPadding + (30 * scale)

      // Project Name - Large and bold
      if (data.projectName) {
        ctx.font = `bold ${32 * scale}px Arial, sans-serif`
        ctx.fillStyle = '#60A5FA' // Light blue
        ctx.fillText(`📋 ${data.projectName}`, padding + innerPadding, yPos)
        yPos += 45 * scale
      }

      ctx.fillStyle = '#FFFFFF'

      // Date
      if (data.date) {
        ctx.font = `${24 * scale}px Arial, sans-serif`
        ctx.fillText(`📅 Date: ${data.date}`, padding + innerPadding, yPos)
        yPos += 38 * scale
      }

      // Task Name
      if (data.taskName) {
        ctx.font = `bold ${26 * scale}px Arial, sans-serif`
        ctx.fillStyle = '#FCD34D' // Yellow
        ctx.fillText(`🔨 Task: ${data.taskName}`, padding + innerPadding, yPos)
        yPos += 38 * scale
        ctx.fillStyle = '#FFFFFF'
      }

      // Progress with bar
      if (data.progress) {
        ctx.font = `${24 * scale}px Arial, sans-serif`
        ctx.fillText(`📊 Progress: ${data.progress}`, padding + innerPadding, yPos)
        yPos += 38 * scale

        // Progress bar
        const barWidth = (panelWidth - 2 * innerPadding)
        const barHeight = 20 * scale
        const progressValue = parseFloat(data.progress) || 0

        // Background bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(padding + innerPadding, yPos - 10 * scale, barWidth, barHeight)

        // Progress bar
        ctx.fillStyle = progressValue >= 100 ? '#10B981' : '#3B82F6'
        ctx.fillRect(padding + innerPadding, yPos - 10 * scale, (barWidth * progressValue / 100), barHeight)

        yPos += 30 * scale
      }

      // Completed Tasks Count
      if (data.completedTasks) {
        ctx.font = `${22 * scale}px Arial, sans-serif`
        ctx.fillStyle = '#10B981' // Green
        ctx.fillText(`✅ Completed: ${data.completedTasks}`, padding + innerPadding, yPos)
        yPos += 35 * scale
      }

      // Total Cost
      if (data.totalCost) {
        ctx.font = `${22 * scale}px Arial, sans-serif`
        ctx.fillStyle = '#FCD34D' // Yellow
        ctx.fillText(`💰 Cost: ${data.totalCost}`, padding + innerPadding, yPos)
      }

      // Custom Text
      if (data.customText) {
        ctx.font = `italic ${20 * scale}px Arial, sans-serif`
        ctx.fillStyle = '#D1D5DB'
        ctx.fillText(data.customText, padding + innerPadding, yPos)
      }

      // Watermark - Bottom Right
      ctx.font = `bold ${28 * scale}px Arial, sans-serif`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.textAlign = 'right'
      ctx.fillText('4D BIM Simulation', width - (30 * scale), height - (30 * scale))

      // Recording indicator - Top Right (Animated)
      const time = Date.now()
      const pulse = Math.sin(time / 300) * 0.3 + 0.7 // Pulsing effect
      
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`
      ctx.beginPath()
      ctx.arc(width - (50 * scale), 50 * scale, 15 * scale, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${24 * scale}px Arial, sans-serif`
      ctx.fillText('● REC', width - (100 * scale), 58 * scale)
    }
  }

  private async getMediaStream(): Promise<MediaStream> {
    if (this.stream) return this.stream

    try {
      this.setupOverlayCanvas()
      
      if (!this.overlayCanvas) {
        throw new Error('Failed to create overlay canvas')
      }

      // Capture stream from overlay canvas (which includes original + text)
      const stream = this.overlayCanvas.captureStream(this.options.fps || 60)
      this.stream = stream
      
      // Start animation loop to update overlay
      const animate = () => {
        this.drawOverlay()
        this.animationFrameId = requestAnimationFrame(animate)
      }
      animate()

      return stream
    } catch (err) {
      console.error('Error getting media stream:', err)
      throw new Error('Failed to get media stream for recording.')
    }
  }

  private getMimeType(): string {
    const format = this.options.format || 'webm'
    
    if (format === 'mp4') {
      // Try H.264 codec for MP4
      if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264')) {
        return 'video/mp4; codecs=h264'
      }
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        return 'video/mp4'
      }
      // Fallback to WebM if MP4 not supported
      console.warn('MP4 not supported, falling back to WebM')
      return 'video/webm; codecs=vp9'
    }
    
    // WebM with VP9 (best quality)
    if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
      return 'video/webm; codecs=vp9'
    }
    
    // Fallback to VP8
    return 'video/webm; codecs=vp8'
  }

  public updateOverlayData(data: RecordingOptions['overlayData']) {
    if (this.options.overlayData) {
      this.options.overlayData = { ...this.options.overlayData, ...data }
    }
  }

  public async start(onStopCallback: (blob: Blob, format: string) => void) {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      console.warn('Recording already in progress.')
      return
    }

    try {
      const stream = await this.getMediaStream()
      const quality = this.getQualitySettings()
      const mimeType = this.getMimeType()
      
      this.recordedChunks = []
      
      // Try to use higher quality settings
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: quality.bitrate,
      }
      
      this.mediaRecorder = new MediaRecorder(stream, recorderOptions)

      console.log(`🎥 Recording started: ${mimeType} at ${quality.width}x${quality.height}, ${quality.bitrate / 1000000}Mbps, ${this.options.fps}fps`)

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
          console.log(`📦 Chunk recorded: ${(event.data.size / 1024 / 1024).toFixed(2)} MB`)
        }
      }

      this.mediaRecorder.onstop = () => {
        const format = this.options.format || 'webm'
        const blob = new Blob(this.recordedChunks, { 
          type: format === 'mp4' ? 'video/mp4' : 'video/webm' 
        })
        onStopCallback(blob, format)
        this.cleanupStream()
      }

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        this.cleanupStream()
      }

      // Request data every 1 second for smoother recording
      this.mediaRecorder.start(1000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  public stop() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
      console.log('Recording stopped.')
    }
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  private cleanupStream() {
    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Stop stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    // Clean up overlay canvas
    if (this.overlayCanvas) {
      this.overlayCanvas = null
      this.overlayContext = null
    }
  }

  public dispose() {
    this.stop()
    this.cleanupStream()
    this.mediaRecorder = null
  }
}