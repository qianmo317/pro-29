import { VStack, HStack, Text, Box } from '@chakra-ui/react'
import type { TicketRecord, User } from '@/types'

const ACTION_COLORS: Record<string, string> = {
  created: '#00B894',
  assigned: '#74B9FF',
  status_changed: '#A29BFE',
  comment: '#6C5CE7',
  confirmed: '#FDCB6E',
}

const ACTION_LABELS: Record<string, string> = {
  created: '创建工单',
  assigned: '分配工单',
  status_changed: '变更状态',
  comment: '添加备注',
  confirmed: '确认工单',
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

interface TimelineProps {
  records: TicketRecord[]
  users: User[]
}

export default function Timeline({ records, users }: TimelineProps) {
  const userMap = new Map(users.map(u => [u.id, u]))
  const sorted = [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <VStack align="stretch" spacing={0} position="relative">
      {sorted.map((record, index) => {
        const operator = userMap.get(record.operatorId)
        const dotColor = ACTION_COLORS[record.action] || '#6C5CE7'
        const actionLabel = ACTION_LABELS[record.action] || record.action
        const isLast = index === sorted.length - 1

        return (
          <HStack key={record.id} align="stretch" spacing={4}>
            <VStack spacing={0} w="20px" flexShrink={0} position="relative">
              <Box
                w="12px"
                h="12px"
                borderRadius="50%"
                bg={dotColor}
                flexShrink={0}
                mt="14px"
                zIndex={1}
              />
              {!isLast && (
                <Box
                  flex={1}
                  w="2px"
                  minH="20px"
                  bgGradient="linear(to bottom, #6C5CE7, #A29BFE)"
                  borderRadius="1px"
                  opacity={0.4}
                />
              )}
            </VStack>

            <Box
              flex={1}
              pb={isLast ? 0 : 5}
              pt={2}
            >
              <HStack spacing={2} mb={1}>
                <Text fontSize="sm" fontWeight="600" color="#2D3748">
                  {operator?.name ?? '未知用户'}
                </Text>
                <Text fontSize="xs" color={dotColor} fontWeight="500">
                  {actionLabel}
                </Text>
              </HStack>
              <Text fontSize="sm" color="#718096" mb={1}>
                {record.content}
              </Text>
              <Text fontSize="xs" color="#A0AEC0">
                {formatTimestamp(record.createdAt)}
              </Text>
            </Box>
          </HStack>
        )
      })}
    </VStack>
  )
}
