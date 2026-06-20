import { create } from 'zustand'
import type {
  TicketTemplate,
} from '@/types'
import { MOCK_TEMPLATES } from '@/utils/mockData'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

interface TemplateState {
  templates: TicketTemplate[]
  nextId: number
  initialize: () => void
  addTemplate: (template: Omit<TicketTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => TicketTemplate
  updateTemplate: (id: string, updates: Partial<TicketTemplate>) => void
  deleteTemplate: (id: string) => void
  toggleActive: (id: string) => void
  getTemplateById: (id: string) => TicketTemplate | undefined
  getActiveTemplates: () => TicketTemplate[]
  getAllTemplates: () => TicketTemplate[]
}

const STORAGE_KEY_TEMPLATES = 'ticket_templates'
const STORAGE_KEY_NEXT_ID = 'template_next_id'

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: MOCK_TEMPLATES,
  nextId: 6,

  initialize: () => {
    const savedTemplates = loadFromStorage<TicketTemplate[]>(STORAGE_KEY_TEMPLATES)
    const savedNextId = loadFromStorage<number>(STORAGE_KEY_NEXT_ID)
    if (savedTemplates) set({ templates: savedTemplates })
    if (savedNextId) set({ nextId: savedNextId })
  },

  addTemplate: (templateData) => {
    const { nextId } = get()
    const id = `tpl-${String(nextId).padStart(3, '0')}`
    const now = new Date().toISOString()
    const newTemplate: TicketTemplate = {
      ...templateData,
      id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    set((state) => {
      const templates = [newTemplate, ...state.templates]
      saveToStorage(STORAGE_KEY_TEMPLATES, templates)
      saveToStorage(STORAGE_KEY_NEXT_ID, nextId + 1)
      return { templates, nextId: nextId + 1 }
    })
    return newTemplate
  },

  updateTemplate: (id, updates) => {
    set((state) => {
      const templates = state.templates.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
      saveToStorage(STORAGE_KEY_TEMPLATES, templates)
      return { templates }
    })
  },

  deleteTemplate: (id) => {
    set((state) => {
      const templates = state.templates.filter(t => t.id !== id)
      saveToStorage(STORAGE_KEY_TEMPLATES, templates)
      return { templates }
    })
  },

  toggleActive: (id) => {
    set((state) => {
      const templates = state.templates.map(t =>
        t.id === id ? { ...t, isActive: !t.isActive, updatedAt: new Date().toISOString() } : t
      )
      saveToStorage(STORAGE_KEY_TEMPLATES, templates)
      return { templates }
    })
  },

  getTemplateById: (id) => {
    return get().templates.find(t => t.id === id)
  },

  getActiveTemplates: () => {
    return get().templates.filter(t => t.isActive)
  },

  getAllTemplates: () => {
    return get().templates
  },
}))
