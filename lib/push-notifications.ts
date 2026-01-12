// Push Notifications Utility

export interface PushNotificationOptions {
  title: string
  body: string
  url?: string
  tag?: string
}

// Check if browser supports notifications
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

// Get current notification permission
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

// Show local notification (doesn't require server)
export async function showLocalNotification(options: PushNotificationOptions): Promise<void> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications not supported')
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready

  // Show notification
  await registration.showNotification(options.title, {
    body: options.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: options.url || '/',
    tag: options.tag || 'default',
    requireInteraction: false,
    vibrate: [200, 100, 200]
  })
}

// Initialize push notifications
export async function initializePushNotifications(): Promise<boolean> {
  try {
    // Check support
    if (!isNotificationSupported()) {
      console.warn('Push notifications not supported')
      return false
    }

    // Register service worker
    const registration = await registerServiceWorker()
    if (!registration) {
      return false
    }

    // Request permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return false
    }

    console.log('Push notifications initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize push notifications:', error)
    return false
  }
}

// Test notification
export async function sendTestNotification(): Promise<void> {
  await showLocalNotification({
    title: '🎉 Notifications Enabled!',
    body: 'You will now receive real-time updates from BIM 4D Scheduler',
    url: '/dashboard',
    tag: 'test'
  })
}
