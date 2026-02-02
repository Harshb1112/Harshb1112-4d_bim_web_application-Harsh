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
      bitrate: options.bitrate || 30000000, // 30 Mbps for Full HD (increased)
      includeOverlay: options.includeOverlay !== false,
      overlayData: options.overlayData || {}
    }
  }

  private getQualitySettings() {
    const qualities = {
      hd: { width: 1280, height: 720, bitrate: 12000000 },       // 12 Mbps for smooth animation
      fullhd: { width: 1920, height: 1080, bitrate: 25000000 },  // 25 Mbps for high quality animation
      '4k': { width: 3840, height: 2160, bitrate: 50000000 }     // 50 Mbps for 4K animation
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

    // CRITICAL: Clear previous frame COMPLETELY to ensure fresh capture
    ctx.clearRect(0, 0, width, height)

    // CRITICAL FIX: Draw the LIVE 3D viewer canvas content
    // This captures the actual animation frame-by-frame as the simulation plays
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high' // High quality for smooth animation
    
    // Save context state
    ctx.save()
    
    try {
      // CRITICAL: Capture the CURRENT LIVE state of the 3D viewer canvas
      // This ensures we record the actual animation as elements appear/disappear
      if (this.canvas.width > 0 && this.canvas.height > 0) {
        // Draw the LIVE canvas content - this captures the 3D animation
        ctx.drawImage(this.canvas, 0, 0, width, height)
      } else {
        console.warn('⚠️ Canvas has zero dimensions, skipping frame')
      }
    } catch (e) {
      // If canvas is not ready or WebGL context lost, skip this frame
      console.warn('⚠️ Canvas not ready for capture:', e)
    }
    
    // Restore context state
    ctx.restore()

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

      // Verify source canvas is ready
      if (!this.canvas || this.canvas.width === 0 || this.canvas.height === 0) {
        throw new Error('Source canvas is not ready or has invalid dimensions')
      }

      console.log(`🎬 Source canvas dimensions: ${this.canvas.width}x${this.canvas.height}`)
      console.log(`🎬 Overlay canvas dimensions: ${this.overlayCanvas.width}x${this.overlayCanvas.height}`)

      // Capture stream from overlay canvas at specified FPS
      const fps = this.options.fps || 60
      
      // Check if captureStream is supported
      if (typeof this.overlayCanvas.captureStream !== 'function') {
        throw new Error('captureStream() is not supported in this browser. Please use Chrome, Edge, or Firefox.')
      }
      
      const stream = this.overlayCanvas.captureStream(fps)
      
      // Verify stream has video tracks
      const videoTracks = stream.getVideoTracks()
      if (videoTracks.length === 0) {
        throw new Error('No video tracks in captured stream')
      }
      
      console.log(`🎬 Stream captured successfully with ${videoTracks.length} video track(s)`)
      console.log(`🎬 Video track settings:`, videoTracks[0].getSettings())
      
      this.stream = stream
      
      console.log(`🎬 Starting LIVE canvas capture at ${fps} FPS for animation recording`)
      
      // CRITICAL: Start continuous animation loop to capture LIVE 3D viewer updates
      // This ensures we record the actual BIM model animation as it builds step-by-step
      let frameCount = 0
      let lastLogTime = Date.now()
      let lastFrameTime = Date.now()
      const targetFrameTime = 1000 / fps // Target time per frame in ms
      
      const animate = () => {
        const now = Date.now()
        const elapsed = now - lastFrameTime
        
        // CRITICAL: Capture frame at target FPS rate
        // This ensures smooth animation recording
        if (elapsed >= targetFrameTime) {
          // CRITICAL: Draw the CURRENT LIVE state of the 3D viewer canvas
          // This captures the animation as elements appear/disappear during simulation
          this.drawOverlay()
          frameCount++
          lastFrameTime = now - (elapsed % targetFrameTime) // Adjust for drift
        }
        
        // Continue animation loop at maximum speed
        this.animationFrameId = requestAnimationFrame(animate)
        
        // Log every 2 seconds for monitoring
        if (now - lastLogTime >= 2000) {
          const actualFps = Math.round(frameCount / ((now - lastLogTime) / 1000))
          console.log(`📹 Recording LIVE animation... Frame ${frameCount} (${actualFps} fps actual, target ${fps} fps)`)
          frameCount = 0
          lastLogTime = now
        }
      }
      
      // Start animation loop immediately to begin capturing
      animate()

      return stream
    } catch (err) {
      console.error('❌ Error getting media stream:', err)
      throw new Error(`Failed to get media stream: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private getMimeType(): string {
    const format = this.options.format || 'webm'
    
    if (format === 'mp4') {
      // Try H.264 High Profile for best quality
      if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.640028"')) {
        return 'video/mp4; codecs="avc1.640028"' // H.264 High Profile Level 4.0
      }
      if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264')) {
        return 'video/mp4; codecs=h264'
      }
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        return 'video/mp4'
      }
      // Fallback to WebM if MP4 not supported
      console.warn('MP4 not supported, falling back to WebM VP9')
      return 'video/webm; codecs=vp9'
    }
    
    // WebM with VP9 (best quality) - Profile 0 for better compatibility
    if (MediaRecorder.isTypeSupported('video/webm; codecs="vp9,opus"')) {
      return 'video/webm; codecs="vp9,opus"'
    }
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
      console.warn('⚠️ Recording already in progress.')
      return
    }

    try {
      console.log('🎬 [1/5] Getting media stream from canvas...')
      const stream = await this.getMediaStream()
      
      console.log('🎬 [2/5] Getting quality settings...')
      const quality = this.getQualitySettings()
      
      console.log('🎬 [3/5] Determining MIME type...')
      const mimeType = this.getMimeType()
      console.log(`🎬 Selected MIME type: ${mimeType}`)
      
      // Verify MIME type is supported
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error(`MIME type ${mimeType} is not supported by this browser`)
      }
      
      this.recordedChunks = []
      
      // Use optimized quality settings
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: quality.bitrate,
      }
      
      console.log('🎬 [4/5] Creating MediaRecorder...')
      this.mediaRecorder = new MediaRecorder(stream, recorderOptions)

      console.log(`🎥 [5/5] Recording started successfully!`)
      console.log(`   Format: ${mimeType}`)
      console.log(`   Resolution: ${quality.width}x${quality.height}`)
      console.log(`   Bitrate: ${quality.bitrate / 1000000}Mbps`)
      console.log(`   FPS: ${this.options.fps}`)

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
          const totalSize = this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
          console.log(`📦 Chunk ${this.recordedChunks.length}: ${(event.data.size / 1024 / 1024).toFixed(2)} MB (Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB)`)
        }
      }

      this.mediaRecorder.onstop = () => {
        console.log('🎬 Recording stopped, creating video blob...')
        const format = this.options.format || 'webm'
        const blob = new Blob(this.recordedChunks, { 
          type: format === 'mp4' ? 'video/mp4' : 'video/webm' 
        })
        console.log(`✅ Video blob created: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)
        onStopCallback(blob, format)
        this.cleanupStream()
      }

      this.mediaRecorder.onerror = (event: any) => {
        console.error('❌ MediaRecorder error:', event)
        console.error('Error details:', event.error)
        this.cleanupStream()
      }

      this.mediaRecorder.onstart = () => {
        console.log('✅ MediaRecorder started successfully')
      }

      // Request data every 1 second for stable recording
      console.log('🎬 Starting MediaRecorder with 1000ms timeslice...')
      this.mediaRecorder.start(1000)
      
      // Verify recording started
      setTimeout(() => {
        if (this.mediaRecorder?.state !== 'recording') {
          console.error('❌ MediaRecorder failed to start. State:', this.mediaRecorder?.state)
          throw new Error('MediaRecorder failed to start')
        }
        console.log('✅ MediaRecorder state verified: recording')
      }, 100)
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
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