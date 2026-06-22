import { useState, useMemo, useEffect } from 'react'
import { VStack, HStack, Text, Box } from '@chakra-ui/react'
import type { TicketRecord, User } from '@/types'
import { useTicketStore } from '@/store/ticketStore'
import AttachmentList from '@/components/AttachmentList/AttachmentList'

const ACTION_COLORS: Record<string, string> = {
  created: '#00B894',
  assigned: '#74B9FF',
  status_changed: '#A29BFE',
  comment: '#6C5CE7',
  confirmed: '#FDCB6E',
  merged: '#718096',
  merged_to: '#718096',
  edited: '#ED8936',
  evaluated: '#F5B041',
}

const ACTION_LABELS: Record<string, string> = {
  created: '创建工单',
  assigned: '分配工单',
  status_changed: '变更状态',
  comment: '添加备注',
  confirmed: '确认工单',
  merged: '合并工单',
  merged_to: '合并到主工单',
  edited: '编辑工单',
  evaluated: '提交评价',
}

const ALL_COLOR = '#6C5CE7'

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
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const getAttachmentsByRecordId = useTicketStore((s) => s.getAttachmentsByRecordId)
  const userMap = new Map(users.map(u => [u.id, u]))
  const sorted = useMemo(
    () => [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [records]
  )

  const availableActions = useMemo(() => {
    const present = new Set(records.map(r => r.action))
    return Object.keys(ACTION_LABELS).filter(a => present.has(a))
  }, [records])

  useEffect(() => {
    if (selectedAction !== 'all' && !availableActions.includes(selectedAction)) {
      setSelectedAction('all')
    }
  }, [availableActions, selectedAction])

  const filtered = selectedAction === 'all'
    ? sorted
    : sorted.filter(r => r.action === selectedAction)

  const renderFilterChip = (
    key: string,
    label: string,
    color: string,
    count: number,
    isActive: boolean,
    onClick: () => void
  ) => (
    <Box
      key={key}
      as="button"
      type="button"
      display="flex"
      alignItems="center"
      gap="6px"
      px={3}
      py={1.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="600"
      cursor="pointer"
      transition="all 0.15s ease"
      bg={isActive ? color : '#F7FAFC'}
      color={isActive ? 'white' : '#4A5568'}
      border="1px solid"
      borderColor={isActive ? color : 'transparent'}
      _hover={{ bg: isActive ? color : '#EDF2F7' }}
      _active={{ transform: 'scale(0.97)' }}
      onClick={onClick}
      userSelect="none"
      whiteSpace="nowrap"
    >
      {!isActive && (
        <Box w="7px" h="7px" borderRadius="50%" bg={color} flexShrink={0} />
      )}
      <Text as="span">{label}</Text>
      <Text as="span" opacity={0.8}>{count}</Text>
    </Box>
  )

  return (
    <VStack align="stretch" spacing={0} position="relative">
      {sorted.length > 0 && (
        <HStack spacing={2} mb={5} flexWrap="wrap">
          {renderFilterChip(
            'all',
            '全部',
            ALL_COLOR,
            sorted.length,
            selectedAction === 'all',
            () => setSelectedAction('all')
          )}
          {availableActions.map(action => {
            const count = sorted.filter(r => r.action === action).length
            return renderFilterChip(
              action,
              ACTION_LABELS[action],
              ACTION_COLORS[action] || ALL_COLOR,
              count,
              selectedAction === action,
              () => setSelectedAction(action)
            )
          })}
        </HStack>
      )}

      {filtered.length === 0 ? (
        <Text fontSize="sm" color="gray.400" textAlign="center" py={6}>
          暂无处理记录
        </Text>
      ) : (
        filtered.map((record, index) => {
          const operator = userMap.get(record.operatorId)
          const dotColor = ACTION_COLORS[record.action] || '#6C5CE7'
          const actionLabel = ACTION_LABELS[record.action] || record.action
          const isLast = index === filtered.length - 1

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
                <AttachmentList attachments={getAttachmentsByRecordId(record.id)} />
                <Text fontSize="xs" color="#A0AEC0">
                  {formatTimestamp(record.createdAt)}
                </Text>
              </Box>
            </HStack>
          )
        })
      )}
    </VStack>
  )
}
