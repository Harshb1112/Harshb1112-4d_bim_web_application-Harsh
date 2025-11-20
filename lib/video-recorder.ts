export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private stream: MediaStream | null = null
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  private async getMediaStream(): Promise<MediaStream> {
    if (this.stream) return this.stream

    try {
      // Request display media (screen capture)
      // This is a conceptual implementation. In a real browser, this would trigger a permission prompt.
      // For WebContainer, we're capturing the canvas directly.
      const stream = this.canvas.captureStream(30) // 30 FPS
      this.stream = stream
      return stream
    } catch (err) {
      console.error('Error getting media stream:', err)
      throw new Error('Failed to get media stream for recording.')
    }
  }

  public async start(onStopCallback: (blob: Blob) => void) {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      console.warn('Recording already in progress.')
      return
    }

    try {
      const stream = await this.getMediaStream()
      this.recordedChunks = []
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp9', // Prefer VP9 for better quality/compression
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
        onStopCallback(blob)
        this.cleanupStream()
      }

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        this.cleanupStream()
      }

      this.mediaRecorder.start()
      console.log('Recording started.')
    } catch (error) {
      console.error('Failed to start recording:', error)
      // Handle error, e.g., show a toast
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
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
  }

  public dispose() {
    this.stop()
    this.cleanupStream()
    this.mediaRecorder = null
  }
}