import { create } from 'zustand'
import type { TicketFollower, Notification, TicketRecord } from '@/types'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

interface NotificationState {
  followers: TicketFollower[]
  notifications: Notification[]
  initialize: () => void
  followTicket: (ticketId: string, userId: string) => void
  unfollowTicket: (ticketId: string, userId: string) => void
  isFollowing: (ticketId: string, userId: string) => boolean
  getFollowersByTicketId: (ticketId: string) => TicketFollower[]
  getFollowedTicketsByUserId: (userId: string) => string[]
  createNotificationsForFollowers: (ticketId: string, record: TicketRecord, excludeUserId?: string) => void
  getNotificationsByUserId: (userId: string) => Notification[]
  getUnreadCountByUserId: (userId: string) => number
  markAsRead: (notificationId: string) => void
  markAllAsRead: (userId: string) => void
  clearNotifications: (userId: string) => void
}

const STORAGE_KEY_FOLLOWERS = 'ticket_followers'
const STORAGE_KEY_NOTIFICATIONS = 'notifications'

export const useNotificationStore = create<NotificationState>((set, get) => ({
  followers: [],
  notifications: [],

  initialize: () => {
    const savedFollowers = loadFromStorage<TicketFollower[]>(STORAGE_KEY_FOLLOWERS)
    const savedNotifications = loadFromStorage<Notification[]>(STORAGE_KEY_NOTIFICATIONS)
    if (savedFollowers) set({ followers: savedFollowers })
    if (savedNotifications) set({ notifications: savedNotifications })
  },

  followTicket: (ticketId, userId) => {
    if (get().isFollowing(ticketId, userId)) return
    const now = new Date().toISOString()
    const follower: TicketFollower = {
      id: `f_${Date.now()}`,
      ticketId,
      userId,
      createdAt: now,
    }
    set((state) => {
      const followers = [...state.followers, follower]
      saveToStorage(STORAGE_KEY_FOLLOWERS, followers)
      return { followers }
    })
  },

  unfollowTicket: (ticketId, userId) => {
    set((state) => {
      const followers = state.followers.filter(
        (f) => !(f.ticketId === ticketId && f.userId === userId)
      )
      saveToStorage(STORAGE_KEY_FOLLOWERS, followers)
      return { followers }
    })
  },

  isFollowing: (ticketId, userId) => {
    return get().followers.some(
      (f) => f.ticketId === ticketId && f.userId === userId
    )
  },

  getFollowersByTicketId: (ticketId) => {
    return get().followers.filter((f) => f.ticketId === ticketId)
  },

  getFollowedTicketsByUserId: (userId) => {
    return get().followers
      .filter((f) => f.userId === userId)
      .map((f) => f.ticketId)
  },

  createNotificationsForFollowers: (ticketId, record, excludeUserId) => {
    const followers = get().getFollowersByTicketId(ticketId)
    const now = new Date().toISOString()
    const newNotifications: Notification[] = []

    for (const follower of followers) {
      if (excludeUserId && follower.userId === excludeUserId) continue
      newNotifications.push({
        id: `n_${Date.now()}_${follower.userId}`,
        userId: follower.userId,
        ticketId,
        recordId: record.id,
        isRead: false,
        createdAt: now,
      })
    }

    if (newNotifications.length === 0) return

    set((state) => {
      const notifications = [...newNotifications, ...state.notifications]
      saveToStorage(STORAGE_KEY_NOTIFICATIONS, notifications)
      return { notifications }
    })
  },

  getNotificationsByUserId: (userId) => {
    return get().notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  getUnreadCountByUserId: (userId) => {
    return get().notifications.filter(
      (n) => n.userId === userId && !n.isRead
    ).length
  },

  markAsRead: (notificationId) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
      saveToStorage(STORAGE_KEY_NOTIFICATIONS, notifications)
      return { notifications }
    })
  },

  markAllAsRead: (userId) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.userId === userId ? { ...n, isRead: true } : n
      )
      saveToStorage(STORAGE_KEY_NOTIFICATIONS, notifications)
      return { notifications }
    })
  },

  clearNotifications: (userId) => {
    set((state) => {
      const notifications = state.notifications.filter((n) => n.userId !== userId)
      saveToStorage(STORAGE_KEY_NOTIFICATIONS, notifications)
      return { notifications }
    })
  },
}))
