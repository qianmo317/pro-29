import { create } from 'zustand'
import type { Tag } from '@/types'
import { TAG_COLORS } from '@/types'
import { MOCK_TAGS } from '@/utils/mockData'
import { saveToStorage, loadFromStorage } from '@/utils/storage'
import { useTicketStore } from './ticketStore'
import { useScheduledTicketStore } from './scheduledTicketStore'

interface TagState {
  tags: Tag[]
  nextId: number
  initialize: () => void
  addTag: (name: string, color?: string) => Tag
  updateTag: (id: string, name: string, color: string) => void
  deleteTag: (id: string) => void
  getTagById: (id: string) => Tag | undefined
  getTagByName: (name: string) => Tag | undefined
}

const STORAGE_KEY = 'tags'
const STORAGE_KEY_NEXT_ID = 'tag_next_id'

export const useTagStore = create<TagState>((set, get) => ({
  tags: MOCK_TAGS,
  nextId: 1,

  initialize: () => {
    const savedTags = loadFromStorage<Tag[]>(STORAGE_KEY)
    const savedNextId = loadFromStorage<number>(STORAGE_KEY_NEXT_ID)
    if (savedTags) set({ tags: savedTags })
    if (savedNextId) set({ nextId: savedNextId })
  },

  addTag: (name, color) => {
    const trimmed = name.trim()
    const existing = get().getTagByName(trimmed)
    if (existing) return existing

    const { nextId } = get()
    const id = `tag_${nextId}`
    const tag: Tag = {
      id,
      name: trimmed,
      color: color || TAG_COLORS[(nextId - 1) % TAG_COLORS.length],
    }
    set((state) => {
      const tags = [...state.tags, tag]
      saveToStorage(STORAGE_KEY, tags)
      saveToStorage(STORAGE_KEY_NEXT_ID, nextId + 1)
      return { tags, nextId: nextId + 1 }
    })
    return tag
  },

  updateTag: (id, name, color) => {
    const trimmed = name.trim()
    if (!trimmed) return
    set((state) => {
      const tags = state.tags.map(t =>
        t.id === id ? { ...t, name: trimmed, color } : t
      )
      saveToStorage(STORAGE_KEY, tags)
      return { tags }
    })
  },

  deleteTag: (id) => {
    set((state) => {
      const tags = state.tags.filter(t => t.id !== id)
      saveToStorage(STORAGE_KEY, tags)
      return { tags }
    })
    useTicketStore.getState().removeTag(id)
    useScheduledTicketStore.getState().removeTag(id)
  },

  getTagById: (id) => get().tags.find(t => t.id === id),

  getTagByName: (name) => {
    const target = name.trim().toLowerCase()
    return get().tags.find(t => t.name.toLowerCase() === target)
  },
}))
