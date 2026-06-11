import { Badge } from '@chakra-ui/react'
import { STATUS_LABELS, STATUS_COLORS } from '@/types'
import type { TicketStatus } from '@/types'

interface StatusBadgeProps {
  status: TicketStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const label = STATUS_LABELS[status]
  const color = STATUS_COLORS[status]

  return (
    <Badge
      borderRadius="8px"
      bg={`${color}20`}
      color={color}
      fontSize={size === 'sm' ? 'xs' : 'sm'}
      px={size === 'sm' ? 2 : 3}
      py={size === 'sm' ? '2px' : 1}
    >
      {label}
    </Badge>
  )
}
