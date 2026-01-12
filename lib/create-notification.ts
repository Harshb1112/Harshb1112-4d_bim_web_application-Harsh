import { prisma } from './db'

export interface CreateNotificationParams {
  userId: number
  type: string
  title: string
  body: string
  url?: string
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        url: params.url || '/dashboard'
      }
    })
    console.log('Notification created for user:', params.userId)
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

// Helper to notify when task is assigned
export async function notifyTaskAssigned(taskId: number, assigneeId: number, assignerName: string, taskName: string): Promise<void> {
  await createNotification({
    userId: assigneeId,
    type: 'task_assigned',
    title: '📋 New Task Assigned',
    body: `${assignerName} assigned you: ${taskName}`,
    url: `/dashboard/tasks`
  })
}

// Helper to notify when task is updated
export async function notifyTaskUpdated(taskId: number, assigneeId: number, updaterName: string, taskName: string): Promise<void> {
  await createNotification({
    userId: assigneeId,
    type: 'task_updated',
    title: '✏️ Task Updated',
    body: `${updaterName} updated: ${taskName}`,
    url: `/dashboard/tasks`
  })
}

// Helper to notify when project is updated
export async function notifyProjectUpdated(projectId: number, userIds: number[], projectName: string): Promise<void> {
  for (const userId of userIds) {
    await createNotification({
      userId,
      type: 'project_updated',
      title: '🏗️ Project Updated',
      body: `${projectName} has been updated`,
      url: `/project/${projectId}`
    })
  }
}
