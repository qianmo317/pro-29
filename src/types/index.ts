export type TicketStatus = 'pending' | 'assigned' | 'in_progress' | 'waiting_confirmation' | 'closed' | 'rejected' | 'merged'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketCategory = 'network' | 'hardware' | 'software' | 'security' | 'access' | 'other'
export type UserRole = 'admin' | 'agent' | 'submitter'

export interface Department {
  id: string
  name: string
  description: string
  color: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export const TAG_COLORS: string[] = [
  '#6C5CE7',
  '#00B894',
  '#0984E3',
  '#E17055',
  '#00CEC9',
  '#FDCB6E',
  '#E84393',
  '#A29BFE',
]

export interface User {
  id: string
  name: string
  role: UserRole
  avatar: string
  email: string
  password: string
  departmentId: string | null
}

export interface Ticket {
  id: string
  title: string
  description: string
  category: TicketCategory
  tags: string[]
  priority: TicketPriority
  status: TicketStatus
  creatorId: string
  assigneeId: string | null
  departmentId: string | null
  createdAt: string
  updatedAt: string
  slaDeadline: string
  knowledgeId: string | null
  mergedToId: string | null
  mergedTicketIds: string[]
}

export interface TicketRecord {
  id: string
  ticketId: string
  operatorId: string
  action: string
  content: string
  createdAt: string
}

export interface TicketEvaluation {
  id: string
  ticketId: string
  rating: number
  comment: string
  evaluatorId: string
  assigneeId: string
  createdAt: string
}

export const MAX_RATING = 5

export const RATING_LABELS: Record<number, string> = {
  1: '非常不满意',
  2: '不满意',
  3: '一般',
  4: '满意',
  5: '非常满意',
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
  merged: '已合并',
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
  merged: '#718096',
}

export interface ImportTicketRow {
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  assigneeName?: string
  departmentName?: string
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

export interface BatchOperationResultItem {
  id: string
  title: string
  reason: string
}

export interface BatchOperationResult {
  total: number
  success: number
  failed: number
  failedItems: BatchOperationResultItem[]
}

export const IMPORT_TEMPLATE_HEADERS = [
  { key: 'title', label: '标题', required: true },
  { key: 'description', label: '描述', required: true },
  { key: 'category', label: '分类', required: true },
  { key: 'priority', label: '优先级', required: true },
  { key: 'departmentName', label: '指派部门', required: false },
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

export interface TicketFollower {
  id: string
  ticketId: string
  userId: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  ticketId: string
  recordId: string
  isRead: boolean
  createdAt: string
}

export type ScheduledTicketStatus = 'pending' | 'created' | 'cancelled'

export interface ScheduledTicket {
  id: string
  title: string
  description: string
  category: TicketCategory
  tags: string[]
  priority: TicketPriority
  creatorId: string
  assigneeId: string | null
  departmentId: string | null
  scheduledTime: string
  status: ScheduledTicketStatus
  createdAt: string
  createdTicketId: string | null
  cancelledAt: string | null
}

export const SCHEDULED_STATUS_LABELS: Record<ScheduledTicketStatus, string> = {
  pending: '等待生效',
  created: '已生成',
  cancelled: '已取消',
}

export const SCHEDULED_STATUS_COLORS: Record<ScheduledTicketStatus, string> = {
  pending: '#FDCB6E',
  created: '#00B894',
  cancelled: '#718096',
}

export type AnnouncementLevel = 'info' | 'warning' | 'critical'

export interface Announcement {
  id: string
  title: string
  content: string
  level: AnnouncementLevel
  creatorId: string
  createdAt: string
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

export interface AnnouncementReadRecord {
  id: string
  announcementId: string
  userId: string
  readAt: string
}

export const ANNOUNCEMENT_LEVEL_LABELS: Record<AnnouncementLevel, string> = {
  info: '通知',
  warning: '提醒',
  critical: '重要',
}

export const ANNOUNCEMENT_LEVEL_COLORS: Record<AnnouncementLevel, string> = {
  info: '#3182CE',
  warning: '#D69E2E',
  critical: '#E53E3E',
}
