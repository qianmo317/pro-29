import { useState } from 'react'
import { useTicketStore } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Select,
  Textarea,
  Badge,
  Divider,
  useToast,
  Flex,
  Icon,
  Avatar,
} from '@chakra-ui/react'
import { ArrowLeft, User, Clock, AlertTriangle, Play, Check, X, MessageSquare, RotateCcw } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import SLAIndicator from '@/components/SLAIndicator/SLAIndicator'
import Timeline from '@/components/Timeline/Timeline'
import { CATEGORY_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS } from '@/types'
import { type TicketStatus } from '@/types'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`
}

const CATEGORY_COLORS: Record<string, string> = {
  network: '#3182CE',
  hardware: '#E53E3E',
  software: '#805AD5',
  security: '#D69E2E',
  access: '#38A169',
  other: '#718096',
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { getTicketById, getRecordsByTicketId, assignTicket, changeStatus, addRecord } = useTicketStore()
  const { users, currentUser } = useUserStore()

  const [assigneeId, setAssigneeId] = useState('')
  const [comment, setComment] = useState('')

  const ticket = getTicketById(id || '')
  const records = getRecordsByTicketId(id || '')

  if (!currentUser) return null

  if (!ticket) {
    return (
      <VStack align="center" justify="center" minH="400px" spacing={4}>
        <Text fontSize="lg" color="gray.500">工单不存在</Text>
        <Button leftIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          返回
        </Button>
      </VStack>
    )
  }

  const getUserName = (userId: string | null) => {
    if (!userId) return '未分配'
    const user = users.find(u => u.id === userId)
    return user ? user.name : '未知'
  }

  const agents = users.filter(u => u.role === 'agent' || u.role === 'admin')

  const handleAssign = () => {
    if (!assigneeId) {
      toast({ title: '请选择处理人', status: 'warning', duration: 2000 })
      return
    }
    assignTicket(ticket.id, assigneeId, currentUser.id)
    setAssigneeId('')
    toast({ title: '已分配处理人', status: 'success', duration: 2000 })
  }

  const handleStatusChange = (newStatus: TicketStatus, content: string) => {
    changeStatus(ticket.id, newStatus, currentUser.id, content)
    toast({ title: '状态已更新', status: 'success', duration: 2000 })
  }

  const handleAddComment = () => {
    if (!comment.trim()) {
      toast({ title: '请输入备注内容', status: 'warning', duration: 2000 })
      return
    }
    addRecord(ticket.id, currentUser.id, 'comment', comment.trim())
    setComment('')
    toast({ title: '备注已添加', status: 'success', duration: 2000 })
  }

  const renderActionPanel = () => {
    switch (ticket.status) {
      case 'pending':
        return (
          <VStack align="stretch" spacing={3}>
            <HStack>
              <Select
                placeholder="选择处理人"
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                borderRadius="8px"
              >
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </Select>
              <Button colorScheme="blue" onClick={handleAssign} flexShrink={0}>
                分配
              </Button>
            </HStack>
          </VStack>
        )
      case 'assigned':
        return (
          <Button
            colorScheme="purple"
            leftIcon={<Icon as={Play} />}
            onClick={() => handleStatusChange('in_progress', '开始处理工单')}
            w="full"
          >
            开始处理
          </Button>
        )
      case 'in_progress':
        return (
          <VStack align="stretch" spacing={3}>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={Check} />}
              onClick={() => handleStatusChange('waiting_confirmation', '提交待确认')}
            >
              提交待确认
            </Button>
            <Divider />
            <Text fontSize="sm" fontWeight="600" color="#2D3748">添加备注</Text>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="输入备注内容..."
              borderRadius="8px"
              rows={3}
            />
            <Button
              colorScheme="gray"
              leftIcon={<Icon as={MessageSquare} />}
              onClick={handleAddComment}
              size="sm"
            >
              提交备注
            </Button>
          </VStack>
        )
      case 'waiting_confirmation':
        return (
          <VStack align="stretch" spacing={3}>
            <Button
              colorScheme="green"
              leftIcon={<Icon as={Check} />}
              onClick={() => handleStatusChange('closed', '确认完成')}
            >
              确认完成
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              leftIcon={<Icon as={X} />}
              onClick={() => handleStatusChange('in_progress', '驳回，需重新处理')}
            >
              驳回
            </Button>
          </VStack>
        )
      case 'closed':
        return (
          <Text fontSize="sm" color="gray.500" textAlign="center" py={2}>已关闭</Text>
        )
      case 'rejected':
        return (
          <Button
            colorScheme="orange"
            leftIcon={<Icon as={RotateCcw} />}
            onClick={() => handleStatusChange('in_progress', '重新处理工单')}
            w="full"
          >
            重新处理
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Flex align="center" gap={3}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          p={1}
        >
          <Icon as={ArrowLeft} boxSize={5} />
        </Button>
        <Text fontSize="sm" color="gray.500" fontWeight="500">{ticket.id}</Text>
        <Heading size="md" flex={1} isTruncated>{ticket.title}</Heading>
        <StatusBadge status={ticket.status} size="md" />
      </Flex>

      <SimpleGrid columns={3} spacing={6}>
        <Box gridColumn="span 2">
          <Card borderRadius="16px">
            <CardBody p={6}>
              <VStack align="stretch" spacing={5}>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#2D3748" mb={3}>工单信息</Text>
                  <SimpleGrid columns={2} spacing={3}>
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>分类</Text>
                      <Badge
                        borderRadius="6px"
                        bg={`${CATEGORY_COLORS[ticket.category]}20`}
                        color={CATEGORY_COLORS[ticket.category]}
                        fontSize="xs"
                        px={2}
                        py="2px"
                      >
                        {CATEGORY_LABELS[ticket.category]}
                      </Badge>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>优先级</Text>
                      <HStack spacing={1.5}>
                        <Box w="8px" h="8px" borderRadius="50%" bg={PRIORITY_COLORS[ticket.priority]} flexShrink={0} />
                        <Text fontSize="sm">{PRIORITY_LABELS[ticket.priority]}</Text>
                      </HStack>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>创建人</Text>
                      <Text fontSize="sm">{getUserName(ticket.creatorId)}</Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>处理人</Text>
                      <Text fontSize="sm">{getUserName(ticket.assigneeId)}</Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>创建时间</Text>
                      <Text fontSize="sm">{formatDateTime(ticket.createdAt)}</Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>更新时间</Text>
                      <Text fontSize="sm">{formatDateTime(ticket.updatedAt)}</Text>
                    </HStack>
                    <HStack spacing={2} gridColumn="span 2">
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>SLA 截止</Text>
                      <Text fontSize="sm">{formatDateTime(ticket.slaDeadline)}</Text>
                    </HStack>
                  </SimpleGrid>
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#2D3748" mb={2}>工单描述</Text>
                  <Text fontSize="sm" color="#4A5568" lineHeight="1.8" whiteSpace="pre-wrap">
                    {ticket.description}
                  </Text>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </Box>

        <VStack align="stretch" spacing={6}>
          <Card borderRadius="16px">
            <CardBody p={5}>
              <SLAIndicator slaDeadline={ticket.slaDeadline} size="md" />
            </CardBody>
          </Card>

          <Card borderRadius="16px">
            <CardBody p={5}>
              <Text fontSize="sm" fontWeight="600" color="#2D3748" mb={4}>操作面板</Text>
              {renderActionPanel()}
            </CardBody>
          </Card>
        </VStack>
      </SimpleGrid>

      <Card borderRadius="16px">
        <CardBody p={6}>
          <Text fontSize="sm" fontWeight="600" color="#2D3748" mb={4}>处理记录</Text>
          <Timeline records={records} users={users} />
        </CardBody>
      </Card>
    </VStack>
  )
}
