import { create } from 'zustand'
import type {
  ScheduledTicket,
  ScheduledTicketStatus,
  TicketCategory,
  TicketPriority,
} from '@/types'
import { saveToStorage, loadFromStorage } from '@/utils/storage'
import { useTicketStore } from './ticketStore'

interface ScheduledTicketInput {
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  creatorId: string
  assigneeId: string | null
  scheduledTime: string
}

interface ScheduledTicketState {
  scheduledTickets: ScheduledTicket[]
  nextId: number
  initialize: () => void
  addScheduledTicket: (data: ScheduledTicketInput) => ScheduledTicket
  cancelScheduledTicket: (id: string) => void
  processDueTickets: () => void
  getScheduledTicketById: (id: string) => ScheduledTicket | undefined
}

const STORAGE_KEY = 'scheduled_tickets'
const STORAGE_KEY_NEXT_ID = 'scheduled_next_id'

export const useScheduledTicketStore = create<ScheduledTicketState>((set, get) => ({
  scheduledTickets: [],
  nextId: 1,

  initialize: () => {
    const savedTickets = loadFromStorage<ScheduledTicket[]>(STORAGE_KEY)
    const savedNextId = loadFromStorage<number>(STORAGE_KEY_NEXT_ID)
    if (savedTickets) set({ scheduledTickets: savedTickets })
    if (savedNextId) set({ nextId: savedNextId })
  },

  addScheduledTicket: (data) => {
    const { nextId } = get()
    const id = `SCH-${String(nextId).padStart(3, '0')}`
    const now = new Date().toISOString()
    const newScheduled: ScheduledTicket = {
      ...data,
      id,
      status: 'pending',
      createdAt: now,
      createdTicketId: null,
      cancelledAt: null,
    }
    set((state) => {
      const scheduledTickets = [newScheduled, ...state.scheduledTickets]
      saveToStorage(STORAGE_KEY, scheduledTickets)
      saveToStorage(STORAGE_KEY_NEXT_ID, nextId + 1)
      return { scheduledTickets, nextId: nextId + 1 }
    })
    return newScheduled
  },

  cancelScheduledTicket: (id) => {
    const ticket = get().getScheduledTicketById(id)
    if (!ticket || ticket.status !== 'pending') return
    const now = new Date().toISOString()
    set((state) => {
      const scheduledTickets = state.scheduledTickets.map((s) =>
        s.id === id
          ? { ...s, status: 'cancelled' as ScheduledTicketStatus, cancelledAt: now }
          : s
      )
      saveToStorage(STORAGE_KEY, scheduledTickets)
      return { scheduledTickets }
    })
  },

  processDueTickets: () => {
    const now = new Date()
    const dueTickets = get().scheduledTickets.filter(
      (s) => s.status === 'pending' && new Date(s.scheduledTime) <= now
    )
    if (dueTickets.length === 0) return

    const addTicket = useTicketStore.getState().addTicket
    const created = dueTickets.map((s) => {
      const newTicket = addTicket({
        title: s.title,
        description: s.description,
        category: s.category,
        priority: s.priority,
        creatorId: s.creatorId,
        assigneeId: s.assigneeId,
        knowledgeId: null,
      })
      return { id: s.id, createdTicketId: newTicket.id }
    })

    set((state) => {
      const scheduledTickets = state.scheduledTickets.map((s) => {
        const match = created.find((c) => c.id === s.id)
        if (match) {
          return {
            ...s,
            status: 'created' as ScheduledTicketStatus,
            createdTicketId: match.createdTicketId,
          }
        }
        return s
      })
      saveToStorage(STORAGE_KEY, scheduledTickets)
      return { scheduledTickets }
    })
  },

  getScheduledTicketById: (id) => get().scheduledTickets.find((s) => s.id === id),
}))
