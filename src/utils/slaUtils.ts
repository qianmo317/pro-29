import type { TicketPriority } from '@/types'
import type { SLAConfig } from '@/types'
import { MOCK_SLA_CONFIGS } from './mockData'

export function getSLADeadline(priority: TicketPriority, createdAt: string): string {
  const config = MOCK_SLA_CONFIGS.find(c => c.priority === priority)
  const hours = config ? config.resolutionHours : 24
  return new Date(new Date(createdAt).getTime() + hours * 3600000).toISOString()
}

export function getSLARemaining(slaDeadline: string): {
  hours: number
  minutes: number
  percentage: number
  isOverdue: boolean
  isWarning: boolean
} {
  const now = new Date().getTime()
  const deadline = new Date(slaDeadline).getTime()
  const diff = deadline - now
  const isOverdue = diff < 0
  const isWarning = !isOverdue && diff < 4 * 3600000

  const absDiff = Math.abs(diff)
  const hours = Math.floor(absDiff / 3600000)
  const minutes = Math.floor((absDiff % 3600000) / 60000)

  const createdAgo = deadline - (now - diff)
  const totalDuration = Math.max(deadline - createdAgo, 1)
  const percentage = Math.max(0, Math.min(100, (diff / totalDuration) * 100))

  return { hours, minutes, percentage, isOverdue, isWarning }
}

export function getSLAColor(remaining: ReturnType<typeof getSLARemaining>): string {
  if (remaining.isOverdue) return '#E53E3E'
  if (remaining.isWarning) return '#FF7675'
  if (remaining.percentage > 50) return '#00B894'
  return '#FDCB6E'
}

export function getSLAConfig(priority: TicketPriority): SLAConfig | undefined {
  return MOCK_SLA_CONFIGS.find(c => c.priority === priority)
}
