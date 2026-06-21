import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Collapse,
  Tooltip,
  Flex,
} from '@chakra-ui/react'
import {
  Megaphone,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  AlertCircle,
} from 'lucide-react'
import { useAnnouncementStore } from '@/store/announcementStore'
import { useUserStore } from '@/store/userStore'
import type { Announcement } from '@/types'
import { ANNOUNCEMENT_LEVEL_LABELS, ANNOUNCEMENT_LEVEL_COLORS } from '@/types'

const MAX_VISIBLE = 3

const LEVEL_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

const LEVEL_BG: Record<string, string> = {
  info: '#EBF8FF',
  warning: '#FFFAF0',
  critical: '#FFF5F5',
}

const LEVEL_BORDER: Record<string, string> = {
  info: '#90CDF4',
  warning: '#FBD38D',
  critical: '#FC8181',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

function AnnouncementItem({
  announcement,
  isRead,
  onMarkRead,
}: {
  announcement: Announcement
  isRead: boolean
  onMarkRead: () => void
}) {
  const color = ANNOUNCEMENT_LEVEL_COLORS[announcement.level]
  const bg = LEVEL_BG[announcement.level]
  const border = LEVEL_BORDER[announcement.level]
  const Icon = LEVEL_ICONS[announcement.level]

  return (
    <Box
      bg={isRead ? 'white' : bg}
      border="1px solid"
      borderColor={isRead ? '#E2E8F0' : border}
      borderRadius="12px"
      p={4}
      position="relative"
      transition="all 0.2s"
    >
      <HStack align="flex-start" spacing={3} w="full">
        <Box
          w="32px"
          h="32px"
          borderRadius="8px"
          bg={color}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon size={18} color="white" />
        </Box>
        <VStack spacing={1} flex={1} align="stretch" minW={0}>
          <HStack justify="space-between" w="full">
            <HStack spacing={2} flex={1} minW={0}>
              <Text
                fontSize="sm"
                fontWeight={isRead ? '500' : '700'}
                color={isRead ? '#4A5568' : '#2D3748'}
                isTruncated
              >
                {announcement.title}
              </Text>
              <Badge
                fontSize="10px"
                borderRadius="4px"
                px={1.5}
                py="2px"
                bg={`${color}20`}
                color={color}
                fontWeight="600"
                flexShrink={0}
              >
                {ANNOUNCEMENT_LEVEL_LABELS[announcement.level]}
              </Badge>
            </HStack>
            <Text fontSize="xs" color="#A0AEC0" flexShrink={0}>
              {formatDate(announcement.createdAt)}
            </Text>
          </HStack>
          <Text fontSize="xs" color="#718096" noOfLines={2}>
            {announcement.content}
          </Text>
        </VStack>
        {!isRead && (
          <Tooltip label="标记已读" hasArrow placement="top">
            <IconButton
              aria-label="标记已读"
              variant="ghost"
              size="xs"
              borderRadius="8px"
              onClick={onMarkRead}
              _hover={{ bg: 'whiteAlpha.600' }}
              flexShrink={0}
            >
              <Check size={16} color={color} />
            </IconButton>
          </Tooltip>
        )}
      </HStack>
    </Box>
  )
}

export default function AnnouncementBar() {
  const currentUser = useUserStore((s) => s.currentUser)
  const {
    getActiveAnnouncements,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    isAnnouncementRead,
  } = useAnnouncementStore()
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  if (!currentUser) return null

  const announcements = getActiveAnnouncements()
  const unreadCount = getUnreadCount(currentUser.id)

  if (announcements.length === 0) return null

  const visibleAnnouncements = showAll
    ? announcements
    : announcements.slice(0, MAX_VISIBLE)
  const hasMore = announcements.length > MAX_VISIBLE

  const handleMarkAsRead = (announcementId: string) => {
    markAsRead(announcementId, currentUser.id)
  }

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    markAllAsRead(currentUser.id)
  }

  if (!expanded) {
    return (
      <Box
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        px={6}
        py={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexShrink={0}
      >
        <HStack spacing={2}>
          <Megaphone size={16} color="#6C5CE7" />
          <Text fontSize="sm" fontWeight="600" color="gray.700">
            公告通知
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
        <IconButton
          aria-label="展开公告"
          variant="ghost"
          size="sm"
          borderRadius="8px"
          onClick={() => setExpanded(true)}
          _hover={{ bg: 'gray.100' }}
        >
          <ChevronDown size={18} color="#4A5568" />
        </IconButton>
      </Box>
    )
  }

  return (
    <Box
      bg="#F7F8FC"
      borderBottom="1px solid"
      borderColor="gray.200"
      px={6}
      py={4}
      flexShrink={0}
    >
      <Flex align="center" justify="space-between" mb={3}>
        <HStack spacing={2}>
          <Megaphone size={18} color="#6C5CE7" />
          <Text fontSize="sm" fontWeight="700" color="#2D3748">
            公告通知
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
          {unreadCount > 0 && (
            <Tooltip label="全部已读" hasArrow placement="top">
              <IconButton
                aria-label="全部已读"
                variant="ghost"
                size="xs"
                borderRadius="8px"
                onClick={handleMarkAllAsRead}
                _hover={{ bg: 'gray.200' }}
              >
                <CheckCheck size={16} color="#4A5568" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip label="收起" hasArrow placement="top">
            <IconButton
              aria-label="收起公告"
              variant="ghost"
              size="xs"
              borderRadius="8px"
              onClick={() => setExpanded(false)}
              _hover={{ bg: 'gray.200' }}
            >
              <X size={16} color="#4A5568" />
            </IconButton>
          </Tooltip>
        </HStack>
      </Flex>

      <Collapse in={expanded} animateOpacity>
        <VStack spacing={2} align="stretch">
          {visibleAnnouncements.map((announcement) => (
            <AnnouncementItem
              key={announcement.id}
              announcement={announcement}
              isRead={isAnnouncementRead(announcement.id, currentUser.id)}
              onMarkRead={() => handleMarkAsRead(announcement.id)}
            />
          ))}
          {hasMore && (
            <Flex justify="center" pt={1}>
              <IconButton
                aria-label={showAll ? '收起' : '查看更多'}
                variant="ghost"
                size="sm"
                borderRadius="8px"
                onClick={() => setShowAll(!showAll)}
                _hover={{ bg: 'gray.200' }}
              >
                {showAll ? (
                  <ChevronUp size={18} color="#6C5CE7" />
                ) : (
                  <ChevronDown size={18} color="#6C5CE7" />
                )}
              </IconButton>
            </Flex>
          )}
        </VStack>
      </Collapse>
    </Box>
  )
}
