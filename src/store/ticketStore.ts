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
  BatchOperationResult,
  Attachment,
} from '@/types'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/types'
import { MOCK_TICKETS, MOCK_RECORDS, MOCK_EVALUATIONS } from '@/utils/mockData'
import { getSLADeadline } from '@/utils/slaUtils'
import { saveToStorage, loadFromStorage } from '@/utils/storage'
import { useNotificationStore } from './notificationStore'

export interface AttachmentInput {
  fileName: string
  fileSize: number
  mimeType: string
  data: string
}

interface EditableTicketFields {
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  tags: string[]
}

interface TicketState {
  tickets: Ticket[]
  records: TicketRecord[]
  evaluations: TicketEvaluation[]
  attachments: Attachment[]
  nextId: number
  initialize: () => void
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'slaDeadline' | 'status' | 'mergedToId' | 'mergedTicketIds' | 'tags'> & { tags?: string[] }, attachments?: AttachmentInput[]) => Ticket
  updateTicket: (id: string, updates: Partial<Ticket>) => void
  editTicket: (id: string, updates: EditableTicketFields, operatorId: string) => void
  assignTicket: (id: string, assigneeId: string, operatorId: string) => void
  assignDepartment: (id: string, departmentId: string, operatorId: string) => void
  changeStatus: (id: string, status: TicketStatus, operatorId: string, content: string) => void
  addRecord: (ticketId: string, operatorId: string, action: string, content: string, attachments?: AttachmentInput[]) => void
  getTicketById: (id: string) => Ticket | undefined
  getRecordsByTicketId: (id: string) => TicketRecord[]
  getFilteredTickets: (filters: TicketFilters, users?: { id: string; name: string }[]) => Ticket[]
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
  getDepartmentStats: (departments: { id: string; name: string }[], records: TicketRecord[]) => Array<{
    departmentId: string
    departmentName: string
    totalCount: number
    pendingCount: number
    inProgressCount: number
    closedCount: number
    avgResolutionTime: string
    slaComplianceRate: string
    avgResponseTime: string
  }>
  batchImportTickets: (
    rows: ImportTicketRow[],
    creatorId: string,
    users: { id: string; name: string }[],
    departments: { id: string; name: string }[],
    onProgress?: (current: number, total: number) => void,
  ) => Promise<ImportResult>
  mergeTickets: (mainTicketId: string, mergedTicketIds: string[], operatorId: string) => void
  getMergedTickets: (ticketId: string) => Ticket[]
  getMainTicket: (ticketId: string) => Ticket | undefined
  isTicketMerged: (ticketId: string) => boolean
  removeTag: (tagId: string) => void
  batchAssignTickets: (ticketIds: string[], assigneeId: string, operatorId: string) => BatchOperationResult
  batchCloseTickets: (ticketIds: string[], operatorId: string, content: string) => BatchOperationResult
  getAttachmentsByTicketId: (ticketId: string) => Attachment[]
  getAttachmentsByRecordId: (recordId: string) => Attachment[]
  getAttachmentById: (attachmentId: string) => Attachment | undefined
  getAllTicketAttachments: (ticketId: string) => Attachment[]
  downloadAttachment: (attachmentId: string) => void
}

export interface TicketFilters {
  status?: TicketStatus
  priority?: TicketPriority
  category?: TicketCategory
  departmentId?: string
  tagId?: string
  search?: string
}

const STORAGE_KEY_TICKETS = 'tickets'
const STORAGE_KEY_RECORDS = 'records'
const STORAGE_KEY_EVALUATIONS = 'evaluations'
const STORAGE_KEY_ATTACHMENTS = 'attachments'
const STORAGE_KEY_NEXT_ID = 'next_id'

function createAttachments(
  inputs: AttachmentInput[],
  ticketId: string,
  recordId: string | null,
  uploaderId: string
): Attachment[] {
  const now = new Date().toISOString()
  return inputs.map((input, index) => ({
    id: `att_${Date.now()}_${index}`,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    data: input.data,
    ticketId,
    recordId,
    uploaderId,
    createdAt: now,
  }))
}

function normalizeRecord(record: TicketRecord): TicketRecord {
  return {
    ...record,
    attachmentIds: record.attachmentIds ?? [],
  }
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: MOCK_TICKETS,
  records: MOCK_RECORDS.map(normalizeRecord),
  evaluations: MOCK_EVALUATIONS,
  attachments: [],
  nextId: 13,

  initialize: () => {
    const savedTickets = loadFromStorage<Ticket[]>(STORAGE_KEY_TICKETS)
    const savedRecords = loadFromStorage<TicketRecord[]>(STORAGE_KEY_RECORDS)
    const savedEvaluations = loadFromStorage<TicketEvaluation[]>(STORAGE_KEY_EVALUATIONS)
    const savedAttachments = loadFromStorage<Attachment[]>(STORAGE_KEY_ATTACHMENTS)
    const savedNextId = loadFromStorage<number>(STORAGE_KEY_NEXT_ID)
    if (savedTickets) {
      const normalizedTickets = savedTickets.map(t => ({
        ...t,
        mergedToId: t.mergedToId ?? null,
        mergedTicketIds: t.mergedTicketIds ?? [],
        departmentId: t.departmentId ?? null,
        tags: t.tags ?? [],
      }))
      set({ tickets: normalizedTickets })
    }
    if (savedRecords) set({ records: savedRecords.map(normalizeRecord) })
    if (savedEvaluations) set({ evaluations: savedEvaluations })
    if (savedAttachments) set({ attachments: savedAttachments })
    if (savedNextId) set({ nextId: savedNextId })
  },

  addTicket: (ticketData, attachmentInputs = []) => {
    const { nextId } = get()
    const id = `TK-${String(nextId).padStart(3, '0')}`
    const now = new Date().toISOString()

    const newRecordId = `r_${Date.now()}`
    const newAttachments = createAttachments(attachmentInputs, id, newRecordId, ticketData.creatorId)
    const newAttachmentIds = newAttachments.map(a => a.id)

    const newTicket: Ticket = {
      ...ticketData,
      id,
      status: ticketData.assigneeId ? 'assigned' : 'pending',
      createdAt: now,
      updatedAt: now,
      slaDeadline: getSLADeadline(ticketData.priority, now),
      mergedToId: null,
      mergedTicketIds: [],
      departmentId: ticketData.departmentId ?? null,
      tags: ticketData.tags ?? [],
    }
    const newRecord: TicketRecord = {
      id: newRecordId,
      ticketId: id,
      operatorId: ticketData.creatorId,
      action: 'created',
      content: ticketData.departmentId ? '创建工单，已指派部门' : '创建工单',
      createdAt: now,
      attachmentIds: newAttachmentIds,
    }
    set((state) => {
      const tickets = [newTicket, ...state.tickets]
      const records = [newRecord, ...state.records]
      const attachments = [...newAttachments, ...state.attachments]
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_RECORDS, records)
      saveToStorage(STORAGE_KEY_ATTACHMENTS, attachments)
      saveToStorage(STORAGE_KEY_NEXT_ID, nextId + 1)
      return { tickets, records, attachments, nextId: nextId + 1 }
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
    const oldTags = [...(ticket.tags ?? [])].sort().join(',')
    const newTags = [...updates.tags].sort().join(',')
    if (oldTags !== newTags) changes.push('标签已修改')

    if (changes.length === 0) return

    const record: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId: id,
      operatorId,
      action: 'edited',
      content: `编辑工单：${changes.join('；')}`,
      createdAt: now,
      attachmentIds: [],
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
              tags: updates.tags,
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
      attachmentIds: [],
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

  assignDepartment: (id, departmentId, operatorId) => {
    if (get().isTicketMerged(id)) return
    const now = new Date().toISOString()
    const record: TicketRecord = {
      id: `r_${Date.now()}`,
      ticketId: id,
      operatorId,
      action: 'department_assigned',
      content: `指派到部门`,
      createdAt: now,
      attachmentIds: [],
    }
    set((state) => {
      const tickets = state.tickets.map(t =>
        t.id === id ? { ...t, departmentId, updatedAt: now } : t
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
      attachmentIds: [],
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

  addRecord: (ticketId, operatorId, action, content, attachmentInputs = []) => {
    if (get().isTicketMerged(ticketId)) return
    const now = new Date().toISOString()
    const recordId = `r_${Date.now()}`
    const newAttachments = createAttachments(attachmentInputs, ticketId, recordId, operatorId)
    const newAttachmentIds = newAttachments.map(a => a.id)
    const record: TicketRecord = {
      id: recordId,
      ticketId,
      operatorId,
      action,
      content,
      createdAt: now,
      attachmentIds: newAttachmentIds,
    }
    set((state) => {
      const records = [record, ...state.records]
      const tickets = state.tickets.map(t =>
        t.id === ticketId ? { ...t, updatedAt: now } : t
      )
      const attachments = [...newAttachments, ...state.attachments]
      saveToStorage(STORAGE_KEY_RECORDS, records)
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_ATTACHMENTS, attachments)
      return { records, tickets, attachments }
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

  getFilteredTickets: (filters, users) => {
    return get().tickets.filter(t => {
      if (filters.status && t.status !== filters.status) return false
      if (filters.priority && t.priority !== filters.priority) return false
      if (filters.category && t.category !== filters.category) return false
      if (filters.departmentId && t.departmentId !== filters.departmentId) return false
      if (filters.tagId && !(t.tags ?? []).includes(filters.tagId)) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        const titleMatch = t.title.toLowerCase().includes(s)
        const idMatch = t.id.toLowerCase().includes(s)
        const descriptionMatch = t.description.toLowerCase().includes(s)
        let assigneeNameMatch = false
        if (t.assigneeId && users) {
          const assignee = users.find(u => u.id === t.assigneeId)
          if (assignee && assignee.name.toLowerCase().includes(s)) {
            assigneeNameMatch = true
          }
        }
        return titleMatch || idMatch || descriptionMatch || assigneeNameMatch
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
      attachmentIds: [],
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

  getDepartmentStats: (departments, records) => {
    const { tickets } = get()
    return departments.map(dept => {
      const deptTickets = tickets.filter(t => t.departmentId === dept.id)
      const totalCount = deptTickets.length
      const pendingCount = deptTickets.filter(t => t.status === 'pending' || t.status === 'assigned').length
      const inProgressCount = deptTickets.filter(t => t.status === 'in_progress').length
      const closedCount = deptTickets.filter(t => t.status === 'closed').length

      const resolved = deptTickets.filter(t => t.status === 'closed' || t.status === 'rejected')
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

      let slaComplianceRate = '-'
      if (resolved.length > 0) {
        const onTime = resolved.filter(t => new Date(t.updatedAt) <= new Date(t.slaDeadline))
        slaComplianceRate = `${Math.round((onTime.length / resolved.length) * 100)}%`
      }

      let totalResponseHours = 0
      let responseCount = 0
      deptTickets.forEach(ticket => {
        const ticketRecords = records.filter(r => r.ticketId === ticket.id)
        const assignRecord = ticketRecords.find(r => r.action === 'assigned' || r.action === 'department_assigned')
        const startRecord = ticketRecords.find(r => r.action === 'status_changed' && r.content.includes('开始处理'))
        if (assignRecord && startRecord) {
          const hours = (new Date(startRecord.createdAt).getTime() - new Date(assignRecord.createdAt).getTime()) / 3600000
          if (hours >= 0) {
            totalResponseHours += hours
            responseCount++
          }
        }
      })
      let avgResponseTime = '-'
      if (responseCount > 0) {
        const avg = totalResponseHours / responseCount
        if (avg < 1) {
          avgResponseTime = `${Math.round(avg * 60)}分钟`
        } else if (avg < 24) {
          avgResponseTime = `${avg.toFixed(1)}小时`
        } else {
          avgResponseTime = `${(avg / 24).toFixed(1)}天`
        }
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalCount,
        pendingCount,
        inProgressCount,
        closedCount,
        avgResolutionTime,
        slaComplianceRate,
        avgResponseTime,
      }
    })
  },

  batchImportTickets: async (rows, creatorId, users, departments, onProgress) => {
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

        let departmentId: string | null = null
        if (row.departmentName?.trim()) {
          const dept = departments.find(
            (d) => d.name.trim() === row.departmentName!.trim()
          )
          if (!dept) {
            failedCount++
            items.push({
              rowIndex: i + 1,
              success: false,
              error: `部门 "${row.departmentName}" 不存在`,
              data: row,
            })
            continue
          }
          departmentId = dept.id
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
          departmentId,
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
      attachmentIds: [],
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
        attachmentIds: [],
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
      const attachments = state.attachments.map(a => {
        if (validMergedIds.includes(a.ticketId)) {
          return { ...a, ticketId: mainTicketId }
        }
        return a
      })

      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      saveToStorage(STORAGE_KEY_RECORDS, records)
      saveToStorage(STORAGE_KEY_ATTACHMENTS, attachments)

      return { tickets, records, attachments }
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

  removeTag: (tagId) => {
    set((state) => {
      const tickets = state.tickets.map(t =>
        (t.tags ?? []).includes(tagId)
          ? { ...t, tags: (t.tags ?? []).filter(id => id !== tagId) }
          : t
      )
      saveToStorage(STORAGE_KEY_TICKETS, tickets)
      return { tickets }
    })
  },

  batchAssignTickets: (ticketIds, assigneeId, operatorId) => {
    const now = new Date().toISOString()
    const failedItems: BatchOperationResult['failedItems'] = []
    const assignableTickets: Ticket[] = []
    const newRecords: TicketRecord[] = []

    ticketIds.forEach((id, index) => {
      const ticket = get().getTicketById(id)
      if (!ticket) {
        failedItems.push({ id, title: '未知工单', reason: '工单不存在' })
        return
      }
      if (get().isTicketMerged(id)) {
        failedItems.push({ id, title: ticket.title, reason: '工单已合并，无法操作' })
        return
      }
      assignableTickets.push(ticket)
      newRecords.push({
        id: `r_${Date.now()}_batchassign_${index}`,
        ticketId: id,
        operatorId,
        action: 'assigned',
        content: '批量分配处理人',
        createdAt: now,
        attachmentIds: [],
      })
    })

    if (assignableTickets.length > 0) {
      const assignableIds = new Set(assignableTickets.map(t => t.id))
      set((state) => {
        const tickets = state.tickets.map(t =>
          assignableIds.has(t.id)
            ? { ...t, assigneeId, status: 'assigned' as TicketStatus, updatedAt: now }
            : t
        )
        const records = [...newRecords, ...state.records]
        saveToStorage(STORAGE_KEY_TICKETS, tickets)
        saveToStorage(STORAGE_KEY_RECORDS, records)
        return { tickets, records }
      })
      newRecords.forEach(record => {
        useNotificationStore.getState().createNotificationsForFollowers(record.ticketId, record, operatorId)
      })
    }

    return {
      total: ticketIds.length,
      success: assignableTickets.length,
      failed: failedItems.length,
      failedItems,
    }
  },

  batchCloseTickets: (ticketIds, operatorId, content) => {
    const now = new Date().toISOString()
    const failedItems: BatchOperationResult['failedItems'] = []
    const closableTickets: Ticket[] = []
    const newRecords: TicketRecord[] = []

    ticketIds.forEach((id, index) => {
      const ticket = get().getTicketById(id)
      if (!ticket) {
        failedItems.push({ id, title: '未知工单', reason: '工单不存在' })
        return
      }
      if (get().isTicketMerged(id)) {
        failedItems.push({ id, title: ticket.title, reason: '工单已合并，无法操作' })
        return
      }
      if (ticket.status === 'closed') {
        failedItems.push({ id, title: ticket.title, reason: '工单已关闭，无需重复操作' })
        return
      }
      if (ticket.status === 'rejected') {
        failedItems.push({ id, title: ticket.title, reason: '工单已驳回，无法关闭' })
        return
      }
      closableTickets.push(ticket)
      newRecords.push({
        id: `r_${Date.now()}_batchclose_${index}`,
        ticketId: id,
        operatorId,
        action: 'status_changed',
        content: content.trim() ? `批量关闭：${content.trim()}` : '批量关闭工单',
        createdAt: now,
        attachmentIds: [],
      })
    })

    if (closableTickets.length > 0) {
      const closableIds = new Set(closableTickets.map(t => t.id))
      set((state) => {
        const tickets = state.tickets.map(t =>
          closableIds.has(t.id)
            ? { ...t, status: 'closed' as TicketStatus, updatedAt: now }
            : t
        )
        const records = [...newRecords, ...state.records]
        saveToStorage(STORAGE_KEY_TICKETS, tickets)
        saveToStorage(STORAGE_KEY_RECORDS, records)
        return { tickets, records }
      })
      newRecords.forEach(record => {
        useNotificationStore.getState().createNotificationsForFollowers(record.ticketId, record, operatorId)
      })
    }

    return {
      total: ticketIds.length,
      success: closableTickets.length,
      failed: failedItems.length,
      failedItems,
    }
  },

  getAttachmentsByTicketId: (ticketId) => {
    return get().attachments.filter(a => a.ticketId === ticketId)
  },

  getAttachmentsByRecordId: (recordId) => {
    return get().attachments.filter(a => a.recordId === recordId)
  },

  getAttachmentById: (attachmentId) => {
    return get().attachments.find(a => a.id === attachmentId)
  },

  getAllTicketAttachments: (ticketId) => {
    const ticket = get().getTicketById(ticketId)
    let ticketIds = [ticketId]
    if (ticket && (ticket.mergedTicketIds ?? []).length > 0) {
      ticketIds = [...ticketIds, ...(ticket.mergedTicketIds ?? [])]
    }
    return get().attachments.filter(a => ticketIds.includes(a.ticketId))
  },

  downloadAttachment: (attachmentId) => {
    const att = get().getAttachmentById(attachmentId)
    if (!att) return
    const byteChars = atob(att.data.split(',')[1] || att.data)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: att.mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = att.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}))
