import { prisma } from "@/lib/prisma"

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  isRead: boolean
  createdAt: Date
  userId?: string
  link?: string // Optional link to redirect when notification is clicked
}

export async function createNotification(data: {
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  userId?: string
  link?: string
}) {
  // For now, we'll store notifications in memory
  // In production, you'd want to store these in the database
  const notification: Notification = {
    id: Math.random().toString(36).substr(2, 9),
    title: data.title,
    message: data.message,
    type: data.type,
    isRead: false,
    createdAt: new Date(),
    userId: data.userId,
    link: data.link
  }

  // Store in global notifications array (in production, use database)
  if (!global.notifications) {
    global.notifications = []
  }
  global.notifications.push(notification)

  return notification
}

export async function getNotifications(userId?: string): Promise<Notification[]> {
  const notifications: Notification[] = []

  try {
    // Guard
    if (!userId) return notifications

    // Attendance notifications removed - attendance system no longer in use

    // Current period (use current semi-monthly period)
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date
    
    // Determine semi-monthly period
    if (now.getDate() <= 15) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 15)
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 16)
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    periodEnd.setHours(23,59,59,999)

    // Payroll entry for this period
    const payroll = await prisma.payroll_entries.findFirst({
      where: {
        users_id: userId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd }
      },
      orderBy: { processedAt: 'desc' }
    })
    if (payroll) {
      if (payroll.status === 'RELEASED') {
        notifications.push({
          id: `pay-${payroll.payroll_entries_id}`,
          title: 'Payroll Released',
          message: 'Your payroll for the current period has been released.',
          type: 'success',
          isRead: false,
          createdAt: payroll.releasedAt || new Date()
        })
      } else if (payroll.status === 'PENDING') {
        notifications.push({
          id: `pay-${payroll.payroll_entries_id}`,
          title: 'Payroll Pending',
          message: 'Your payroll for the current period is pending release.',
          type: 'info',
          isRead: false,
          createdAt: payroll.processedAt
        })
      }
    }


    // Active loans reminder
    const loans = await prisma.loans.findMany({ where: { users_id: userId, status: 'ACTIVE' } })
    if (loans.length > 0) {
      notifications.push({
        id: `loan-${userId}`,
        title: 'Active Loan Deduction',
        message: 'Your active loan will be deducted this payroll.',
        type: 'info',
        isRead: false,
        createdAt: new Date()
      })
    }

    // Payroll period ending notification
    const daysUntilEnd = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilEnd >= 0 && daysUntilEnd <= 3) {
      notifications.push({
        id: `period-end-${periodEnd.getTime()}`,
        title: 'Payroll Period Ending Soon',
        message: `The current payroll period will end ${daysUntilEnd === 0 ? 'today' : `in ${daysUntilEnd} day${daysUntilEnd > 1 ? 's' : ''}`}.`,
        type: 'warning',
        isRead: false,
        createdAt: new Date()
      })
    }

    // Payroll reschedule notifications from global store
    if (global.notifications) {
      const userNotifications = global.notifications.filter(n => 
        n.userId === userId || !n.userId // Include notifications for this user or general notifications
      )
      notifications.push(...userNotifications)
    }

    // Sort by time desc
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (err) {
    console.error('Notifications error:', err)
  }

  return notifications
}

export async function markNotificationAsRead(notificationId: string) {
  if (!global.notifications) {
    global.notifications = []
  }

  const notification = global.notifications.find(n => n.id === notificationId)
  if (notification) {
    notification.isRead = true
  }
}

export async function markAllNotificationsAsRead() {
  if (!global.notifications) {
    global.notifications = []
  }

  global.notifications.forEach(notification => {
    notification.isRead = true
  })
}

// Extend global type for TypeScript
declare global {
  var notifications: Notification[] | undefined
}









