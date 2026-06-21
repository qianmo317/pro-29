import { create } from 'zustand'
import type { Announcement, AnnouncementReadRecord } from '@/types'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

const STORAGE_KEY_ANNOUNCEMENTS = 'announcements'
const STORAGE_KEY_READ_RECORDS = 'announcement_read_records'

interface AnnouncementState {
  announcements: Announcement[]
  readRecords: AnnouncementReadRecord[]
  initialize: () => void
  createAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) => Announcement
  updateAnnouncement: (id: string, data: Partial<Announcement>) => void
  deleteAnnouncement: (id: string) => void
  getAllAnnouncements: () => Announcement[]
  getActiveAnnouncements: () => Announcement[]
  getUnreadAnnouncements: (userId: string) => Announcement[]
  getUnreadCount: (userId: string) => number
  markAsRead: (announcementId: string, userId: string) => void
  markAllAsRead: (userId: string) => void
  isAnnouncementRead: (announcementId: string, userId: string) => boolean
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
  announcements: [],
  readRecords: [],

  initialize: () => {
    const savedAnnouncements = loadFromStorage<Announcement[]>(STORAGE_KEY_ANNOUNCEMENTS)
    const savedReadRecords = loadFromStorage<AnnouncementReadRecord[]>(STORAGE_KEY_READ_RECORDS)
    if (savedAnnouncements) set({ announcements: savedAnnouncements })
    if (savedReadRecords) set({ readRecords: savedReadRecords })
  },

  createAnnouncement: (data) => {
    const now = new Date().toISOString()
    const announcement: Announcement = {
      ...data,
      id: `ann_${Date.now()}`,
      createdAt: now,
    }
    set((state) => {
      const announcements = [announcement, ...state.announcements]
      saveToStorage(STORAGE_KEY_ANNOUNCEMENTS, announcements)
      return { announcements }
    })
    return announcement
  },

  updateAnnouncement: (id, data) => {
    set((state) => {
      const announcements = state.announcements.map((a) =>
        a.id === id ? { ...a, ...data } : a
      )
      saveToStorage(STORAGE_KEY_ANNOUNCEMENTS, announcements)
      return { announcements }
    })
  },

  deleteAnnouncement: (id) => {
    set((state) => {
      const announcements = state.announcements.filter((a) => a.id !== id)
      const readRecords = state.readRecords.filter((r) => r.announcementId !== id)
      saveToStorage(STORAGE_KEY_ANNOUNCEMENTS, announcements)
      saveToStorage(STORAGE_KEY_READ_RECORDS, readRecords)
      return { announcements, readRecords }
    })
  },

  getAllAnnouncements: () => {
    return [...get().announcements].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  getActiveAnnouncements: () => {
    const now = new Date()
    return get()
      .announcements.filter((a) => {
        if (!a.isActive) return false
        const from = new Date(a.effectiveFrom)
        const to = new Date(a.effectiveTo)
        return now >= from && now <= to
      })
      .sort((a, b) => {
        const levelOrder = { critical: 0, warning: 1, info: 2 }
        const levelDiff = levelOrder[a.level] - levelOrder[b.level]
        if (levelDiff !== 0) return levelDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  },

  getUnreadAnnouncements: (userId) => {
    const active = get().getActiveAnnouncements()
    const readIds = new Set(
      get()
        .readRecords.filter((r) => r.userId === userId)
        .map((r) => r.announcementId)
    )
    return active.filter((a) => !readIds.has(a.id))
  },

  getUnreadCount: (userId) => {
    return get().getUnreadAnnouncements(userId).length
  },

  markAsRead: (announcementId, userId) => {
    if (get().isAnnouncementRead(announcementId, userId)) return
    const now = new Date().toISOString()
    const record: AnnouncementReadRecord = {
      id: `arr_${Date.now()}`,
      announcementId,
      userId,
      readAt: now,
    }
    set((state) => {
      const readRecords = [...state.readRecords, record]
      saveToStorage(STORAGE_KEY_READ_RECORDS, readRecords)
      return { readRecords }
    })
  },

  markAllAsRead: (userId) => {
    const active = get().getActiveAnnouncements()
    const now = new Date().toISOString()
    const existingIds = new Set(
      get()
        .readRecords.filter((r) => r.userId === userId)
        .map((r) => r.announcementId)
    )
    const newRecords: AnnouncementReadRecord[] = active
      .filter((a) => !existingIds.has(a.id))
      .map((a, i) => ({
        id: `arr_${Date.now()}_${i}`,
        announcementId: a.id,
        userId,
        readAt: now,
      }))
    if (newRecords.length === 0) return
    set((state) => {
      const readRecords = [...state.readRecords, ...newRecords]
      saveToStorage(STORAGE_KEY_READ_RECORDS, readRecords)
      return { readRecords }
    })
  },

  isAnnouncementRead: (announcementId, userId) => {
    return get().readRecords.some(
      (r) => r.announcementId === announcementId && r.userId === userId
    )
  },
}))
