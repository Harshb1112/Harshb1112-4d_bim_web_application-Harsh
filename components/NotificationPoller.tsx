'use client'

import { useEffect } from 'react'
import { startNotificationPolling } from '@/lib/notification-service'

interface NotificationPollerProps {
  userId?: number
}

export default function NotificationPoller({ userId }: NotificationPollerProps) {
  useEffect(() => {
    if (!userId) return

    // Check if notifications are enabled
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        console.log('Starting notification polling for user:', userId)
        const cleanup = startNotificationPolling(userId)
        return cleanup
      }
    }
  }, [userId])

  return null // This component doesn't render anything
}
