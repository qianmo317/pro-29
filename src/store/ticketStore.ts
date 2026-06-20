import { create } from 'zustand'
import type {
  Ticket,
  TicketRecord,
  TicketEvaluation,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ImportTicketRow,
  ImportResult,
  ImportResultItem,
} from '@/types'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/types'
import { MOCK_TICKETS, MOCK_RECORDS, MOCK_EVALUATIONS } from '@/utils/mockData'
import { getSLADeadline } from '@/utils/slaUtils'
import { saveToStorage, loadFromStorage } from '@/utils/storage'
import { useNotificationStore } from './notificationStore'

interface EditableTicketFields {
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
}

interface TicketState {
  tickets: Ticket[]
  records: TicketRecord[]
  evaluations: TicketEvaluation[]
  nextId: number
  initialize: () => void
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'slaDeadline' | 'status' | 'mergedToId' | 'mergedTicketIds'>) => Ticket
  updateTicket: (id: string, updates: Partial<Ticket>) => void
  editTicket: (id: string, updates: EditableTicketFields, operatorId: string) => void
  assignTicket: (id: string, assigneeId: string, operatorId: string) => void
  changeStatus: (id: string, status: TicketStatus, operatorId: string, content: string) => void
  addRecord: (ticketId: string, operatorId: string, action: string, content: string) => void
  getTicketById: (id: string) => Ticket | undefined
  getRecordsByTicketId: (id: string) => TicketRecord[]
  getFilteredTickets: (filters: TicketFilters) => Ticket[]
  addEvaluation: (ticketId: string, rating: number, comment: string, evaluatorId: string) => void
  getEvaluationByTicketId: (ticketId: string) => TicketEvaluation | undefined
  getEvaluationStats: () => Array<{ agentId: string; averageRating: number; count: number; distribution: Record<number, number> }>
  getStats: () => {
    totalCount: number
    pendingCount: number
    inProgressCount: number
    closedCount: number
    thisMonthCreated: number
    thisMonthClosed: number
    avgResolutionTime: string
    slaComplianceRate: string
  }
  batchImportTickets: (
    rows: ImportTicketRow[],
    creatorId: string,
    users: { id: string; name: string }[],
    onProgress?: (current: number, total: number) => void,
  ) => Promise<ImportResult>
  mergeTickets: (mainTicketId: string, mergedTicketIds: string[], operatorId: string) => void
  getMergedTickets: (ticketId: string) => Ticket[]
  getMainTicket: (ticketId: string) => Ticket | undefined
  isTicketMerged: (ticketId: string) => boolean
}

export interface TicketFilters {
  status?: TicketStatus
  priority?: TicketPriority
  category?: TicketCategory
  search?: string
}

const STORAGE_KEY_TICKETS = 'tickets'
const STORAGE_KEY_RECORDS = 'records'
const STORAGE_KEY_EVALUATIONS = 'evaluations'
const STORAGE_KEY_NEXT_ID = 'next_id'

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: MOCK_TICKETS,
  records: MOCK_RECORDS,
  evaluations: MOCK_EVALUATIONS,
  nextId: 13,

  initialize: () => {
    const savedTickets = loadFromStorage<Ticket[]>(STORAGE_KEY_TICKETS)
    const savedRecords = loadFromStorage<TicketRecord[]>(STORAGE_KEY_RECORDS)
    const savedEvaluations = loadFromStorage<TicketEvaluation[]>(STORAGE_KEY_EVALUATIONS)
    const savedNextId = loadFromStorage<number>(STORAGE_KEY_NEXT_ID)
    if (savedTickets) {
      const normalizedTickets = savedTickets.map(t => ({
        ...t,
        mergedToId: t.mergedToId ?? null,
        mergedTicketIds: t.mergedTicketIds ?? [],
      }))
      set({ tickets: normalizedTickets })
    }
    if (savedRecords) set({ records: savedRecords })
    if (savedEvaluations) set({ evaluations: savedEvaluations })
    if (savedNextId) set({ nextId: savedNextId })
  },

  addTicket: (ticketData) => {
    const { nextId } = get()
    const id = `TK-${String(nextId).padStart(3, '0')}`
    const now = new Date().toISOString()
    const newTicket: Ticket = {
      ...ticketData,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      slaDeadline: getSLADeadline(ticketData.priority, now),
      mergedToId: null,
      mergedTicketIds: [],
    }
    const newRecord: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId: id,
      operatorId: ticketData.creatorId,
      action: 'created',
      content: '创建工单',
      createdAt: now,
    }
    set((state) => {
      const tickets = [newTicket, ...state.tickets]
      const records = [newRecord, ...state.records]
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_RECORDS, records)
      saveToStorage(STORAGE_KEY_NEXT_ID, nextId + 1)
      return { tickets, records, nextId: nextId + 1 }
    })
    return newTicket
  },

  updateTicket: (id, updates) => {
    const ticket = get().getTicketById(id)
    if (!ticket || get().isTicketMerged(id)) return
    set((state) => {
      const tickets = state.tickets.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      return { tickets }
    })
  },

  editTicket: (id, updates, operatorId) => {
    const ticket = get().getTicketById(id)
    if (!ticket || get().isTicketMerged(id)) return
    const now = new Date().toISOString()

    const changes: string[] = []
    if (updates.title !== ticket.title) changes.push(`标题「${ticket.title}」→「${updates.title}」`)
    if (updates.category !== ticket.category) changes.push(`分类「${CATEGORY_LABELS[ticket.category]}」→「${CATEGORY_LABELS[updates.category]}」`)
    if (updates.priority !== ticket.priority) changes.push(`优先级「${PRIORITY_LABELS[ticket.priority]}」→「${PRIORITY_LABELS[updates.priority]}」`)
    if (updates.description !== ticket.description) changes.push('描述已修改')

    if (changes.length === 0) return

    const record: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId: id,
      operatorId,
      action: 'edited',
      content: `编辑工单：${changes.join('；')}`,
      createdAt: now,
    }

    set((state) => {
      const tickets = state.tickets.map(t =>
        t.id === id
          ? {
              ...t,
              title: updates.title,
              description: updates.description,
              category: updates.category,
              priority: updates.priority,
              updatedAt: now,
            }
          : t
      )
      const records = [record, ...state.records]
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_RECORDS, records)
      return { tickets, records }
    })
    useNotificationStore.getState().createNotificationsForFollowers(id, record, operatorId)
  },

  assignTicket: (id, assigneeId, operatorId) => {
    if (get().isTicketMerged(id)) return
    const now = new Date().toISOString()
    const record: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId: id,
      operatorId,
      action: 'assigned',
      content: `分配处理人`,
      createdAt: now,
    }
    set((state) => {
      const tickets = state.tickets.map(t =>
        t.id === id ? { ...t, assigneeId, status: 'assigned' as TicketStatus, updatedAt: now } : t
      )
      const records = [record, ...state.records]
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_RECORDS, records)
      return { tickets, records }
    })
    useNotificationStore.getState().createNotificationsForFollowers(id, record, operatorId)
  },

  changeStatus: (id, status, operatorId, content) => {
    if (get().isTicketMerged(id)) return
    if (status === 'merged') return
    const now = new Date().toISOString()
    const record: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId: id,
      operatorId,
      action: 'status_changed',
      content,
      createdAt: now,
    }
    set((state) => {
      const tickets = state.tickets.map(t =>
        t.id === id ? { ...t, status, updatedAt: now } : t
      )
      const records = [record, ...state.records]
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_RECORDS, records)
      return { tickets, records }
    })
    useNotificationStore.getState().createNotificationsForFollowers(id, record, operatorId)
  },

  addRecord: (ticketId, operatorId, action, content) => {
    if (get().isTicketMerged(ticketId)) return
    const now = new Date().toISOString()
    const record: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId,
      operatorId,
      action,
      content,
      createdAt: now,
    }
    set((state) => {
      const records = [record, ...state.records]
      const tickets = state.tickets.map(t =>
        t.id === ticketId ? { ...t, updatedAt: now } : t
      )
      saveToStorage(STORAGE_KEY_RECORDS, records)
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      return { records, tickets }
    })
    useNotificationStore.getState().createNotificationsForFollowers(ticketId, record, operatorId)
  },

  getTicketById: (id) => {
    return get().tickets.find(t => t.id === id)
  },

  getRecordsByTicketId: (id) => {
    const ticket = get().getTicketById(id)
    let ticketIds = [id]
    if (ticket && (ticket.mergedTicketIds ?? []).length > 0) {
      ticketIds = [...ticketIds, ...(ticket.mergedTicketIds ?? [])]
    }
    return get().records.filter(r => ticketIds.includes(r.ticketId)).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  getFilteredTickets: (filters) => {
    return get().tickets.filter(t => {
      if (filters.status && t.status !== filters.status) return false
      if (filters.priority && t.priority !== filters.priority) return false
      if (filters.category && t.category !== filters.category) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        return t.title.toLowerCase().includes(s) || t.id.toLowerCase().includes(s)
      }
      return true
    })
  },

  addEvaluation: (ticketId, rating, comment, evaluatorId) => {
    const ticket = get().getTicketById(ticketId)
    if (!ticket || get().getEvaluationByTicketId(ticketId)) return
    const assigneeId = ticket.assigneeId
    if (!assigneeId) return

    const now = new Date().toISOString()
    const evaluation: TicketEvaluation = {
      id: `ev_${Date.now()}`,
      ticketId,
      rating,
      comment: comment.trim(),
      evaluatorId,
      assigneeId,
      createdAt: now,
    }
    const record: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId,
      operatorId: evaluatorId,
      action: 'evaluated',
      content: `提交评价：${rating} 星${comment.trim() ? `，${comment.trim()}` : ''}`,
      createdAt: now,
    }
    set((state) => {
      const evaluations = [evaluation, ...state.evaluations]
      const records = [record, ...state.records]
      saveToStorage(STORAGE_KEY_EVALUATIONS, evaluations)
      saveToStorage(STORAGE_KEY_RECORDS, records)
      return { evaluations, records }
    })
    useNotificationStore.getState().createNotificationsForFollowers(ticketId, record, evaluatorId)
  },

  getEvaluationByTicketId: (ticketId) => {
    return get().evaluations.find(e => e.ticketId === ticketId)
  },

  getEvaluationStats: () => {
    const { evaluations } = get()
    const statsMap: Record<string, { totalRating: number; count: number; distribution: Record<number, number> }> = {}
    evaluations.forEach(e => {
      if (!statsMap[e.assigneeId]) {
        statsMap[e.assigneeId] = { totalRating: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
      }
      const s = statsMap[e.assigneeId]
      s.totalRating += e.rating
      s.count += 1
      s.distribution[e.rating] = (s.distribution[e.rating] || 0) + 1
    })
    return Object.entries(statsMap).map(([agentId, s]) => ({
      agentId,
      averageRating: s.count > 0 ? s.totalRating / s.count : 0,
      count: s.count,
      distribution: s.distribution,
    }))
  },

  getStats: () => {
    const { tickets } = get()
    const totalCount = tickets.length
    const pendingCount = tickets.filter(t => t.status === 'pending' || t.status === 'assigned').length
    const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
    const closedCount = tickets.filter(t => t.status === 'closed').length

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthCreated = tickets.filter(t => new Date(t.createdAt) >= startOfMonth).length
    const thisMonthClosed = tickets.filter(t =>
      t.status === 'closed' && new Date(t.updatedAt) >= startOfMonth
    ).length

    const resolved = tickets.filter(t => t.status === 'closed' || t.status === 'rejected')
    let avgResolutionTime = '-'
    if (resolved.length > 0) {
      const totalHours = resolved.reduce((sum, t) => {
        const hours = (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000
        return sum + Math.max(0, hours)
      }, 0)
      const avg = totalHours / resolved.length
      if (avg < 1) {
        avgResolutionTime = `${Math.round(avg * 60)}分钟`
      } else if (avg < 24) {
        avgResolutionTime = `${avg.toFixed(1)}小时`
      } else {
        avgResolutionTime = `${(avg / 24).toFixed(1)}天`
      }
    }

    let slaComplianceRate = '100%'
    if (resolved.length > 0) {
      const onTime = resolved.filter(t => new Date(t.updatedAt) <= new Date(t.slaDeadline))
      slaComplianceRate = `${Math.round((onTime.length / resolved.length) * 100)}%`
    }

    return {
      totalCount,
      pendingCount,
      inProgressCount,
      closedCount,
      thisMonthCreated,
      thisMonthClosed,
      avgResolutionTime,
      slaComplianceRate,
    }
  },

  batchImportTickets: async (rows, creatorId, users, onProgress) => {
    const items: ImportResultItem[] = []
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        if (!row.title?.trim()) {
          failedCount++
          items.push({
            rowIndex: i + 1,
            success: false,
            error: '标题不能为空',
            data: row,
          })
          continue
        }
        if (!row.description?.trim() || row.description.trim().length < 10) {
          failedCount++
          items.push({
            rowIndex: i + 1,
            success: false,
            error: '描述不能为空且至少10个字符',
            data: row,
          })
          continue
        }

        let assigneeId: string | null = null
        if (row.assigneeName?.trim()) {
          const user = users.find(
            (u) => u.name.trim() === row.assigneeName!.trim()
          )
          if (!user) {
            failedCount++
            items.push({
              rowIndex: i + 1,
              success: false,
              error: `处理人 "${row.assigneeName}" 不存在`,
              data: row,
            })
            continue
          }
          assigneeId = user.id
        }

        const newTicket = get().addTicket({
          title: row.title.trim(),
          description: row.description.trim(),
          category: row.category,
          priority: row.priority,
          creatorId,
          assigneeId,
          knowledgeId: null,
        })

        successCount++
        items.push({
          rowIndex: i + 1,
          success: true,
          ticket: newTicket,
          data: row,
        })
      } catch (e) {
        failedCount++
        items.push({
          rowIndex: i + 1,
          success: false,
          error: e instanceof Error ? e.message : '未知错误',
          data: row,
        })
      }

      if (onProgress) {
        onProgress(i + 1, rows.length)
      }

      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    return {
      total: rows.length,
      success: successCount,
      failed: failedCount,
      items,
    }
  },

  mergeTickets: (mainTicketId, mergedTicketIds, operatorId) => {
    const now = new Date().toISOString()
    const mainTicket = get().getTicketById(mainTicketId)
    if (!mainTicket) return
    if (get().isTicketMerged(mainTicketId)) return

    const validMergedIds = mergedTicketIds.filter(id => {
      const t = get().getTicketById(id)
      return t && t.id !== mainTicketId && t.status !== 'merged' && !(t.mergedTicketIds ?? []).length
    })

    if (validMergedIds.length === 0) return

    const allMergedIds = [...new Set([...(mainTicket.mergedTicketIds ?? []), ...validMergedIds])]

    const newRecords: TicketRecord[] = []

    const mergeRecord: TicketRecord = {
      id: `r_${Date.now()}_merge`,
      ticketId: mainTicketId,
      operatorId,
      action: 'merged',
      content: `合并工单：${validMergedIds.join('、')}`,
      createdAt: now,
    }
    newRecords.push(mergeRecord)

    validMergedIds.forEach((id, index) => {
      const mergedRecord: TicketRecord = {
        id: `r_${Date.now()}_merged_${index}`,
        ticketId: id,
        operatorId,
        action: 'merged_to',
        content: `已合并到主工单 ${mainTicketId}`,
        createdAt: now,
      }
      newRecords.push(mergedRecord)
    })

    set((state) => {
      const tickets = state.tickets.map(t => {
        if (t.id === mainTicketId) {
          return {
            ...t,
            mergedTicketIds: allMergedIds,
            updatedAt: now,
          }
        }
        if (validMergedIds.includes(t.id)) {
          return {
            ...t,
            status: 'merged' as TicketStatus,
            mergedToId: mainTicketId,
            updatedAt: now,
          }
        }
        return t
      })

      const records = [...newRecords, ...state.records]

      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_RECORDS, records)

      return { tickets, records }
    })

    useNotificationStore.getState().createNotificationsForFollowers(mainTicketId, mergeRecord, operatorId)
  },

  getMergedTickets: (ticketId) => {
    const ticket = get().getTicketById(ticketId)
    if (!ticket || (ticket.mergedTicketIds ?? []).length === 0) return []
    return (ticket.mergedTicketIds ?? [])
      .map(id => get().getTicketById(id))
      .filter((t): t is Ticket => t !== undefined)
  },

  getMainTicket: (ticketId) => {
    const ticket = get().getTicketById(ticketId)
    if (!ticket || !ticket.mergedToId) return undefined
    return get().getTicketById(ticket.mergedToId)
  },

  isTicketMerged: (ticketId) => {
    const ticket = get().getTicketById(ticketId)
    return ticket?.status === 'merged' || !!ticket?.mergedToId
  },
}))
