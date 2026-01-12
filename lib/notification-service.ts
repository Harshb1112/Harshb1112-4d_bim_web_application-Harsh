// Real-time Notification Service

import { showLocalNotification } from './push-notifications'

export interface NotificationData {
  type: 'task_assigned' | 'task_updated' | 'project_updated' | 'comment_added' | 'deadline_approaching'
  title: string
  body: string
  url?: string
  userId?: number
}

// Send notification to user
export async function sendNotificationToUser(data: NotificationData): Promise<void> {
  try {
    // Check if user has notifications enabled
    const permission = Notification.permission
    if (permission !== 'granted') {
      console.log('Notifications not enabled for user')
      return
    }

    // Show notification
    await showLocalNotification({
      title: data.title,
      body: data.body,
      url: data.url || '/dashboard',
      tag: data.type
    })

    console.log('Notification sent:', data.title)
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

// Notification templates
export const NotificationTemplates = {
  taskAssigned: (taskName: string, assignerName: string) => ({
    type: 'task_assigned' as const,
    title: '📋 New Task Assigned',
    body: `${assignerName} assigned you: ${taskName}`,
    url: '/dashboard/tasks'
  }),

  taskUpdated: (taskName: string, updaterName: string) => ({
    type: 'task_updated' as const,
    title: '✏️ Task Updated',
    body: `${updaterName} updated: ${taskName}`,
    url: '/dashboard/tasks'
  }),

  projectUpdated: (projectName: string) => ({
    type: 'project_updated' as const,
    title: '🏗️ Project Updated',
    body: `${projectName} has been updated`,
    url: '/dashboard/projects'
  }),

  commentAdded: (commenterName: string, taskName: string) => ({
    type: 'comment_added' as const,
    title: '💬 New Comment',
    body: `${commenterName} commented on: ${taskName}`,
    url: '/dashboard/tasks'
  }),

  deadlineApproaching: (taskName: string, daysLeft: number) => ({
    type: 'deadline_approaching' as const,
    title: '⏰ Deadline Approaching',
    body: `${taskName} is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    url: '/dashboard/tasks'
  })
}

// Poll for new notifications (check every 30 seconds)
export function startNotificationPolling(userId: number): () => void {
  let intervalId: NodeJS.Timeout

  const poll = async () => {
    try {
      const response = await fetch('/api/notifications/pending', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const notifications = data.notifications || []

        // Show each notification
        for (const notif of notifications) {
          await sendNotificationToUser({
            type: notif.type,
            title: notif.title,
            body: notif.body,
            url: notif.url,
            userId: notif.userId
          })
        }

        // Mark as shown
        if (notifications.length > 0) {
          await fetch('/api/notifications/mark-shown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              notificationIds: notifications.map((n: any) => n.id)
            })
          })
        }
      }
    } catch (error) {
      console.error('Notification polling error:', error)
    }
  }

  // Poll immediately
  poll()

  // Then poll every 30 seconds
  intervalId = setInterval(poll, 30000)

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  }
}
