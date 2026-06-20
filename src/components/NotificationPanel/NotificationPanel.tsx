import { useNavigate } from 'react-router-dom'
import {
  Box,
  VStack,
  HStack,
  Text,
  Flex,
  Button,
  MenuList,
  MenuItem,
  MenuDivider,
  Badge,
  IconButton,
  Tooltip,
} from '@chakra-ui/react'
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import { useTicketStore } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import type { Notification, TicketRecord } from '@/types'
import { STATUS_LABELS } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  created: '创建工单',
  assigned: '分配工单',
  status_changed: '变更状态',
  comment: '添加备注',
  confirmed: '确认工单',
}

const ACTION_COLORS: Record<string, string> = {
  created: '#00B894',
  assigned: '#74B9FF',
  status_changed: '#A29BFE',
  comment: '#6C5CE7',
  confirmed: '#FDCB6E',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

export default function NotificationPanel() {
  const navigate = useNavigate()
  const currentUser = useUserStore((s) => s.currentUser)
  const users = useUserStore((s) => s.users)
  const {
    getNotificationsByUserId,
    getUnreadCountByUserId,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotificationStore()
  const { getTicketById, getRecordsByTicketId } = useTicketStore()

  if (!currentUser) return null

  const notifications = getNotificationsByUserId(currentUser.id)
  const unreadCount = getUnreadCountByUserId(currentUser.id)

  const getRecord = (notification: Notification): TicketRecord | undefined => {
    const records = getRecordsByTicketId(notification.ticketId)
    return records.find((r) => r.id === notification.recordId)
  }

  const getOperatorName = (operatorId: string): string => {
    const user = users.find((u) => u.id === operatorId)
    return user ? user.name : '未知用户'
  }

  const handleClickNotification = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    navigate(`/tickets/${notification.ticketId}`)
  }

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    markAllAsRead(currentUser.id)
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearNotifications(currentUser.id)
  }

  return (
    <MenuList
      borderRadius="16px"
      p={0}
      minW="400px"
      maxW="440px"
      maxH="560px"
      overflow="hidden"
      boxShadow="0 10px 40px rgba(0,0,0,0.12)"
    >
      <Flex
        align="center"
        justify="space-between"
        px={5}
        py={4}
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <HStack spacing={2}>
          <Bell size={18} color="#6C5CE7" />
          <Text fontSize="sm" fontWeight="700" color="#2D3748">
            消息通知
          </Text>
          {unreadCount > 0 && (
            <Badge
              borderRadius="full"
              bg="#E53E3E"
              color="white"
              fontSize="xs"
              px={2}
              py="2px"
              fontWeight="600"
            >
              {unreadCount} 条未读
            </Badge>
          )}
        </HStack>
        <HStack spacing={1}>
          {notifications.length > 0 && (
            <>
              <Tooltip label="全部已读" hasArrow placement="top">
                <IconButton
                  aria-label="全部已读"
                  variant="ghost"
                  size="xs"
                  borderRadius="8px"
                  onClick={handleMarkAllAsRead}
                  _hover={{ bg: 'gray.100' }}
                >
                  <CheckCheck size={16} color="#4A5568" />
                </IconButton>
              </Tooltip>
              <Tooltip label="清空通知" hasArrow placement="top">
                <IconButton
                  aria-label="清空通知"
                  variant="ghost"
                  size="xs"
                  borderRadius="8px"
                  onClick={handleClearAll}
                  _hover={{ bg: 'red.50', color: 'red.500' }}
                >
                  <Trash2 size={16} color="#4A5568" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </HStack>
      </Flex>

      <Box maxH="440px" overflowY="auto">
        {notifications.length === 0 ? (
          <VStack py={16} px={8} spacing={3}>
            <Bell size={40} color="#CBD5E0" />
            <Text fontSize="sm" color="gray.400" fontWeight="500">
              暂无新消息
            </Text>
            <Text fontSize="xs" color="gray.300">
              关注工单后，状态变更时会在这里通知你
            </Text>
          </VStack>
        ) : (
          <VStack spacing={0} align="stretch">
            {notifications.map((notification) => {
              const record = getRecord(notification)
              const ticket = getTicketById(notification.ticketId)
              const actionColor = record ? ACTION_COLORS[record.action] || '#6C5CE7' : '#6C5CE7'
              const actionLabel = record ? ACTION_LABELS[record.action] || record.action : '操作'

              return (
                <Box key={notification.id}>
                  <MenuItem
                    px={5}
                    py={4}
                    onClick={() => handleClickNotification(notification)}
                    _hover={{ bg: notification.isRead ? 'gray.50' : '#F5F3FF' }}
                    bg={notification.isRead ? 'transparent' : '#FAF9FF'}
                    borderRadius={0}
                  >
                    <VStack align="stretch" spacing={2} w="full">
                      <HStack justify="space-between" w="full">
                        <HStack spacing={2}>
                          {!notification.isRead && (
                            <Box
                              w="8px"
                              h="8px"
                              borderRadius="50%"
                              bg="#E53E3E"
                              flexShrink={0}
                            />
                          )}
                          <Text
                            fontSize="sm"
                            fontWeight={notification.isRead ? '500' : '700'}
                            color="#2D3748"
                            isTruncated
                            maxW="220px"
                          >
                            {ticket?.title || notification.ticketId}
                          </Text>
                        </HStack>
                        <HStack spacing={2} flexShrink={0}>
                          <Badge
                            fontSize="10px"
                            borderRadius="4px"
                            px={1.5}
                            py="2px"
                            bg={`${actionColor}20`}
                            color={actionColor}
                            fontWeight="600"
                          >
                            {actionLabel}
                          </Badge>
                          {ticket && (
                            <Badge
                              fontSize="10px"
                              borderRadius="4px"
                              px={1.5}
                              py="2px"
                              variant="subtle"
                              colorScheme="gray"
                              fontWeight="500"
                            >
                              {STATUS_LABELS[ticket.status]}
                            </Badge>
                          )}
                        </HStack>
                      </HStack>

                      {record && (
                        <Text fontSize="xs" color="#718096" pl={notification.isRead ? 0 : '10px'} noOfLines={2}>
                          <Text as="span" fontWeight="600" color="#4A5568">
                            {getOperatorName(record.operatorId)}
                          </Text>
                          ：{record.content}
                        </Text>
                      )}

                      <HStack justify="space-between" pl={notification.isRead ? 0 : '10px'}>
                        <Text fontSize="xs" color="#A0AEC0">
                          {formatTime(notification.createdAt)}
                        </Text>
                        <HStack spacing={1}>
                          <Text fontSize="xs" color="#6C5CE7" fontWeight="500">
                            查看详情
                          </Text>
                          <ExternalLink size={12} color="#6C5CE7" />
                        </HStack>
                      </HStack>
                    </VStack>
                  </MenuItem>
                  <MenuDivider m={0} />
                </Box>
              )
            })}
          </VStack>
        )}
      </Box>

      {notifications.length > 0 && (
        <Flex
          justify="center"
          py={3}
          borderTop="1px solid"
          borderColor="gray.100"
          bg="gray.50"
        >
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              navigate('/tickets')
            }}
            color="#6C5CE7"
            fontWeight="600"
            _hover={{ bg: 'transparent' }}
          >
            查看全部工单 →
          </Button>
        </Flex>
      )}
    </MenuList>
  )
}
