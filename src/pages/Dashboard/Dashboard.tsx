import { Box, SimpleGrid, Card, CardBody, Heading, Text, HStack, VStack, Button, Icon, Badge, Tag } from '@chakra-ui/react'
import { Ticket, Clock, Loader, CheckCircle, Plus, List, AlertTriangle, UserCheck, Inbox } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTicketStore } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import { getSLARemaining } from '@/utils/slaUtils'
import SLAIndicator from '@/components/SLAIndicator/SLAIndicator'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/types'

const STATS_CONFIG = [
  {
    label: '工单总数',
    icon: Ticket,
    gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
  },
  {
    label: '待处理',
    icon: Clock,
    gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)',
  },
  {
    label: '处理中',
    icon: Loader,
    gradient: 'linear-gradient(135deg, #4839C5, #6C5CE7)',
  },
  {
    label: '已关闭',
    icon: CheckCircle,
    gradient: 'linear-gradient(135deg, #00B894, #55EFC4)',
  },
]

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function PriorityBadge({ priority }: { priority: 'critical' | 'high' | 'medium' | 'low' }) {
  return (
    <Badge
      fontSize="xs"
      px={2}
      py={0.5}
      borderRadius="6px"
      color="white"
      bg={PRIORITY_COLORS[priority]}
      fontWeight="600"
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { tickets, getStats } = useTicketStore()
  const { currentUser } = useUserStore()

  const stats = getStats()
  const statValues = [stats.totalCount, stats.pendingCount, stats.inProgressCount, stats.closedCount]

  const slaAlertTickets = tickets
    .filter(t => {
      if (t.status === 'closed' || t.status === 'rejected') return false
      const remaining = getSLARemaining(t.slaDeadline)
      return remaining.isOverdue || remaining.isWarning
    })
    .sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime())

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const isAdmin = currentUser?.role === 'admin'

  const myPendingTickets = tickets
    .filter(t => {
      if (t.status === 'closed' || t.status === 'rejected' || t.status === 'merged') return false
      if (isAdmin) {
        return t.assigneeId === currentUser?.id
      }
      return t.assigneeId === currentUser?.id
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 8)

  const unassignedTickets = tickets
    .filter(t => t.status === 'pending' && !t.assigneeId)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 8)

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        仪表盘
      </Heading>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5} mb={6}>
        {STATS_CONFIG.map((config, index) => (
          <Card
            key={config.label}
            bgGradient={config.gradient}
            borderRadius="16px"
            shadow="lg"
            _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
            transition="all 0.2s ease"
          >
            <CardBody py={5}>
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="3xl" fontWeight="700" color="white" lineHeight={1.2}>
                    {statValues[index]}
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.800" mt={1}>
                    {config.label}
                  </Text>
                </Box>
                <Icon
                  as={config.icon}
                  boxSize={10}
                  color="whiteAlpha.600"
                />
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} mb={6}>
        <Card borderLeft="4px solid" borderLeftColor="#E53E3E">
          <CardBody>
            <HStack mb={4}>
              <Icon as={AlertTriangle} color="#E53E3E" boxSize={5} />
              <Heading size="sm">SLA 超时告警</Heading>
            </HStack>
            {slaAlertTickets.length === 0 ? (
              <Text color="gray.400" fontSize="sm" py={4} textAlign="center">
                暂无告警
              </Text>
            ) : (
              <VStack align="stretch" spacing={3}>
                {slaAlertTickets.map(ticket => (
                  <HStack
                    key={ticket.id}
                    p={3}
                    bg="gray.50"
                    borderRadius="12px"
                    cursor="pointer"
                    _hover={{ bg: 'gray.100' }}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    justify="space-between"
                  >
                    <Box flex={1} minW={0}>
                      <HStack spacing={2} mb={1}>
                        <Text fontSize="sm" fontWeight="600" color="brand.500">
                          {ticket.id}
                        </Text>
                        <Text fontSize="sm" noOfLines={1}>
                          {ticket.title}
                        </Text>
                      </HStack>
                    </Box>
                    <SLAIndicator slaDeadline={ticket.slaDeadline} size="sm" />
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <HStack mb={4}>
              <Icon as={Ticket} color="brand.500" boxSize={5} />
              <Heading size="sm">近期工单</Heading>
            </HStack>
            <VStack align="stretch" spacing={3}>
              {recentTickets.map(ticket => (
                <HStack
                  key={ticket.id}
                  p={3}
                  bg="gray.50"
                  borderRadius="12px"
                  cursor="pointer"
                  _hover={{ bg: 'gray.100' }}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  justify="space-between"
                >
                  <Box flex={1} minW={0}>
                    <HStack spacing={2} mb={1}>
                      <Text fontSize="sm" fontWeight="600" color="brand.500">
                        {ticket.id}
                      </Text>
                      <Text fontSize="sm" noOfLines={1} flex={1}>
                        {ticket.title}
                      </Text>
                    </HStack>
                    <HStack spacing={2}>
                      <StatusBadge status={ticket.status} size="sm" />
                      <Text fontSize="xs" color="gray.400">
                        {formatTimeAgo(ticket.updatedAt)}
                      </Text>
                    </HStack>
                  </Box>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: isAdmin ? 2 : 1 }} spacing={5} mb={6}>
        <Card>
          <CardBody>
            <HStack mb={4} justify="space-between">
              <HStack>
                <Icon as={UserCheck} color="#0984E3" boxSize={5} />
                <Heading size="sm">待我处理</Heading>
                {myPendingTickets.length > 0 && (
                  <Badge colorScheme="blue" borderRadius="full" px={2}>
                    {myPendingTickets.length}
                  </Badge>
                )}
              </HStack>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="brand"
                onClick={() => navigate('/tickets?filter=mine')}
              >
                查看全部
              </Button>
            </HStack>
            {myPendingTickets.length === 0 ? (
              <Text color="gray.400" fontSize="sm" py={8} textAlign="center">
                暂无待处理工单
              </Text>
            ) : (
              <VStack align="stretch" spacing={3}>
                {myPendingTickets.map(ticket => (
                  <HStack
                    key={ticket.id}
                    p={3}
                    bg="gray.50"
                    borderRadius="12px"
                    cursor="pointer"
                    _hover={{ bg: 'gray.100', transform: 'translateX(2px)' }}
                    transition="all 0.15s ease"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    justify="space-between"
                    align="flex-start"
                  >
                    <Box flex={1} minW={0}>
                      <HStack spacing={2} mb={1.5} align="center">
                        <PriorityBadge priority={ticket.priority} />
                        <Text fontSize="sm" fontWeight="600" color="brand.500">
                          {ticket.id}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" noOfLines={1} fontWeight="500" mb={1.5}>
                        {ticket.title}
                      </Text>
                      <HStack spacing={2}>
                        <StatusBadge status={ticket.status} size="sm" />
                        <Text fontSize="xs" color="gray.400">
                          创建于 {formatTimeAgo(ticket.createdAt)}
                        </Text>
                      </HStack>
                    </Box>
                    <SLAIndicator slaDeadline={ticket.slaDeadline} size="sm" />
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        {isAdmin && (
          <Card borderLeft="4px solid" borderLeftColor="#A29BFE">
            <CardBody>
              <HStack mb={4} justify="space-between">
                <HStack>
                  <Icon as={Inbox} color="#A29BFE" boxSize={5} />
                  <Heading size="sm">待分配工单</Heading>
                  {unassignedTickets.length > 0 && (
                    <Badge colorScheme="purple" borderRadius="full" px={2}>
                      {unassignedTickets.length}
                    </Badge>
                  )}
                </HStack>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="purple"
                  onClick={() => navigate('/tickets?filter=unassigned')}
                >
                  查看全部
                </Button>
              </HStack>
              {unassignedTickets.length === 0 ? (
                <Text color="gray.400" fontSize="sm" py={8} textAlign="center">
                  暂无待分配工单
                </Text>
              ) : (
                <VStack align="stretch" spacing={3}>
                  {unassignedTickets.map(ticket => (
                    <HStack
                      key={ticket.id}
                      p={3}
                      bg="gray.50"
                      borderRadius="12px"
                      cursor="pointer"
                      _hover={{ bg: 'gray.100', transform: 'translateX(2px)' }}
                      transition="all 0.15s ease"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      justify="space-between"
                      align="flex-start"
                    >
                      <Box flex={1} minW={0}>
                        <HStack spacing={2} mb={1.5} align="center">
                          <PriorityBadge priority={ticket.priority} />
                          <Text fontSize="sm" fontWeight="600" color="brand.500">
                            {ticket.id}
                          </Text>
                        </HStack>
                        <Text fontSize="sm" noOfLines={1} fontWeight="500" mb={1.5}>
                          {ticket.title}
                        </Text>
                        <HStack spacing={2}>
                          <Tag size="sm" colorScheme="purple" variant="outline" borderRadius="6px">
                            待分配
                          </Tag>
                          <Text fontSize="xs" color="gray.400">
                            创建于 {formatTimeAgo(ticket.createdAt)}
                          </Text>
                        </HStack>
                      </Box>
                      <SLAIndicator slaDeadline={ticket.slaDeadline} size="sm" />
                    </HStack>
                  ))}
                </VStack>
              )}
            </CardBody>
          </Card>
        )}
      </SimpleGrid>

      <HStack spacing={4}>
        <Button
          leftIcon={<Icon as={Plus} />}
          colorScheme="brand"
          size="lg"
          onClick={() => navigate('/tickets/create')}
        >
          创建工单
        </Button>
        <Button
          leftIcon={<Icon as={List} />}
          variant="outline"
          colorScheme="brand"
          size="lg"
          onClick={() => navigate('/tickets')}
        >
          查看全部工单
        </Button>
      </HStack>
    </Box>
  )
}
