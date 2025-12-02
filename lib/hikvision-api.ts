/**
 * Hikvision Camera Integration
 * 
 * This module provides integration with Hikvision cameras via:
 * 1. Hik-Connect Cloud API (OneHikID) - For cloud-connected cameras
 * 2. Direct RTSP/ISAPI - For local network cameras
 * 
 * For real live streaming, you need:
 * - Hikvision camera with Hik-Connect enabled
 * - OneHikID account (register at hik-connect.com)
 * - Camera added to your Hik-Connect account
 */

// Hik-Connect API Configuration
export interface HikConnectConfig {
  appKey: string        // Get from Hikvision Open Platform
  appSecret: string     // Get from Hikvision Open Platform
  baseUrl: string       // https://open.hik-connect.com (China) or regional
}

// Camera device info
export interface HikDevice {
  deviceSerial: string  // Camera serial number
  deviceName: string
  deviceType: string
  status: 'online' | 'offline'
  channelNo: number
}

// Stream URL response
export interface StreamUrlResponse {
  url: string
  expireTime: number
}

/**
 * Hik-Connect Cloud API Client
 * 
 * To use this:
 * 1. Register at https://open.hikvision.com/
 * 2. Create an application to get appKey and appSecret
 * 3. Add your cameras to Hik-Connect app
 */
export class HikConnectClient {
  private config: HikConnectConfig
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(config: HikConnectConfig) {
    this.config = config
  }

  /**
   * Get access token from Hik-Connect
   */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const response = await fetch(`${this.config.baseUrl}/api/lapp/token/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        appKey: this.config.appKey,
        appSecret: this.config.appSecret
      })
    })

    const data = await response.json()
    
    if (data.code === '200') {
      this.accessToken = data.data.accessToken
      this.tokenExpiry = Date.now() + (data.data.expireTime * 1000) - 60000 // 1 min buffer
      return this.accessToken!
    }

    throw new Error(`Failed to get access token: ${data.msg}`)
  }

  /**
   * Get list of devices (cameras) in your account
   */
  async getDeviceList(): Promise<HikDevice[]> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/api/lapp/device/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        accessToken: token,
        pageStart: '0',
        pageSize: '50'
      })
    })

    const data = await response.json()
    
    if (data.code === '200') {
      return data.data.map((device: any) => ({
        deviceSerial: device.deviceSerial,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        status: device.status === 1 ? 'online' : 'offline',
        channelNo: device.channelNo || 1
      }))
    }

    throw new Error(`Failed to get device list: ${data.msg}`)
  }

  /**
   * Get live stream URL for a camera
   * This returns an HLS or RTMP URL that can be played in browser
   */
  async getLiveStreamUrl(deviceSerial: string, channelNo: number = 1): Promise<StreamUrlResponse> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/api/lapp/live/address/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        accessToken: token,
        deviceSerial: deviceSerial,
        channelNo: channelNo.toString(),
        protocol: '2', // 1=HLS, 2=RTMP, 3=HLS+RTMP
        quality: '1',  // 1=HD, 2=Smooth
        expireTime: '86400' // 24 hours
      })
    })

    const data = await response.json()
    
    if (data.code === '200') {
      return {
        url: data.data.url,
        expireTime: data.data.expireTime
      }
    }

    throw new Error(`Failed to get stream URL: ${data.msg}`)
  }

  /**
   * Get playback URL for recorded video
   */
  async getPlaybackUrl(
    deviceSerial: string, 
    channelNo: number,
    startTime: Date,
    endTime: Date
  ): Promise<StreamUrlResponse> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/api/lapp/playback/url/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        accessToken: token,
        deviceSerial: deviceSerial,
        channelNo: channelNo.toString(),
        startTime: Math.floor(startTime.getTime() / 1000).toString(),
        endTime: Math.floor(endTime.getTime() / 1000).toString()
      })
    })

    const data = await response.json()
    
    if (data.code === '200') {
      return {
        url: data.data.url,
        expireTime: data.data.expireTime
      }
    }

    throw new Error(`Failed to get playback URL: ${data.msg}`)
  }

  /**
   * Capture a snapshot from camera
   */
  async captureSnapshot(deviceSerial: string, channelNo: number = 1): Promise<string> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/api/lapp/device/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        accessToken: token,
        deviceSerial: deviceSerial,
        channelNo: channelNo.toString()
      })
    })

    const data = await response.json()
    
    if (data.code === '200') {
      return data.data.picUrl
    }

    throw new Error(`Failed to capture snapshot: ${data.msg}`)
  }
}

/**
 * Direct RTSP Connection (Local Network)
 * 
 * For cameras on local network without cloud connection
 */
export class HikvisionDirectClient {
  private ip: string
  private username: string
  private password: string
  private port: number

  constructor(ip: string, username: string = 'admin', password: string = '', port: number = 554) {
    this.ip = ip
    this.username = username
    this.password = password
    this.port = port
  }

  /**
   * Get RTSP stream URL
   * Channel: 101=Main, 102=Sub, 103=Panoramic (for 360 cameras)
   */
  getRtspUrl(channel: number = 101): string {
    const auth = this.password ? `${this.username}:${this.password}@` : `${this.username}@`
    return `rtsp://${auth}${this.ip}:${this.port}/Streaming/Channels/${channel}`
  }

  /**
   * Get snapshot URL via ISAPI
   */
  getSnapshotUrl(channel: number = 101): string {
    const auth = this.password ? `${this.username}:${this.password}@` : `${this.username}@`
    return `http://${auth}${this.ip}/ISAPI/Streaming/channels/${channel}/picture`
  }

  /**
   * Get web interface URL
   */
  getWebUrl(): string {
    return `http://${this.ip}`
  }
}

/**
 * Example usage:
 * 
 * // Cloud (Hik-Connect)
 * const hikCloud = new HikConnectClient({
 *   appKey: 'your-app-key',
 *   appSecret: 'your-app-secret',
 *   baseUrl: 'https://open.hik-connect.com'
 * })
 * const streamUrl = await hikCloud.getLiveStreamUrl('DEVICE_SERIAL', 1)
 * 
 * // Direct (Local Network)
 * const hikDirect = new HikvisionDirectClient('192.168.1.64', 'admin', 'Admin@123')
 * const rtspUrl = hikDirect.getRtspUrl(101)
 */

// Environment variables for Hik-Connect
export const HIK_CONNECT_CONFIG = {
  appKey: process.env.HIKVISION_APP_KEY || '',
  appSecret: process.env.HIKVISION_APP_SECRET || '',
  baseUrl: process.env.HIKVISION_API_URL || 'https://open.hik-connect.com'
}
