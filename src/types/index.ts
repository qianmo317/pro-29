export type TicketStatus = 'pending' | 'assigned' | 'in_progress' | 'waiting_confirmation' | 'closed' | 'rejected'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketCategory = 'network' | 'hardware' | 'software' | 'security' | 'access' | 'other'
export type UserRole = 'admin' | 'agent' | 'submitter'

export interface User {
  id: string
  name: string
  role: UserRole
  avatar: string
  email: string
  password: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  creatorId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  slaDeadline: string
  knowledgeId: string | null
}

export interface TicketRecord {
  id: string
  ticketId: string
  operatorId: string
  action: string
  content: string
  createdAt: string
}

export interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: TicketCategory
  tags: string[]
  authorId: string
  createdAt: string
  updatedAt: string
  relatedTicketId: string | null
}

export interface SLAConfig {
  id: string
  category: string
  priority: TicketPriority
  responseHours: number
  resolutionHours: number
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: '待分配',
  assigned: '已分配',
  in_progress: '处理中',
  waiting_confirmation: '待确认',
  closed: '已关闭',
  rejected: '已驳回',
}

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: '紧急',
  high: '高',
  medium: '中',
  low: '低',
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  network: '网络',
  hardware: '硬件',
  software: '软件',
  security: '安全',
  access: '权限',
  other: '其他',
}

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  critical: '#E53E3E',
  high: '#FF7675',
  medium: '#FDCB6E',
  low: '#00B894',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: '#A29BFE',
  assigned: '#74B9FF',
  in_progress: '#6C5CE7',
  waiting_confirmation: '#FDCB6E',
  closed: '#00B894',
  rejected: '#FF7675',
}

export interface ImportTicketRow {
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  assigneeName?: string
}

export interface ImportResultItem {
  rowIndex: number
  success: boolean
  ticket?: Ticket
  error?: string
  data: ImportTicketRow
}

export interface ImportResult {
  total: number
  success: number
  failed: number
  items: ImportResultItem[]
}

export const IMPORT_TEMPLATE_HEADERS = [
  { key: 'title', label: '标题', required: true },
  { key: 'description', label: '描述', required: true },
  { key: 'category', label: '分类', required: true },
  { key: 'priority', label: '优先级', required: true },
  { key: 'assigneeName', label: '处理人', required: false },
]

export const CATEGORY_VALUES = ['network', 'hardware', 'software', 'security', 'access', 'other']
export const PRIORITY_VALUES = ['critical', 'high', 'medium', 'low']

export interface TicketTemplate {
  id: string
  name: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  title: string
  descriptionContent: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  creatorId: string
}
