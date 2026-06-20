import { useState, useMemo, useEffect } from 'react'
import { useTicketStore } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import { useDepartmentStore } from '@/store/departmentStore'
import { useNotificationStore } from '@/store/notificationStore'
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Checkbox,
  Input,
} from '@chakra-ui/react'
import { ArrowLeft, AlertTriangle, Play, Check, X, MessageSquare, RotateCcw, Bell, BellOff, Merge, ExternalLink, Pencil, Star } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import SLAIndicator from '@/components/SLAIndicator/SLAIndicator'
import Timeline from '@/components/Timeline/Timeline'
import { CATEGORY_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, MAX_RATING, RATING_LABELS } from '@/types'
import { type TicketStatus, type TicketCategory, type TicketPriority } from '@/types'
import { FormControl, FormLabel, FormErrorMessage } from '@chakra-ui/react'

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
  const ticketStore = useTicketStore()
  const { users, currentUser, getAgentsByDepartment } = useUserStore()
  const { departments, getDepartmentName } = useDepartmentStore()
  const { isFollowing, followTicket, unfollowTicket } = useNotificationStore()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()

  const [assigneeId, setAssigneeId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [comment, setComment] = useState('')
  const [mergeSearch, setMergeSearch] = useState('')
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([])

  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<TicketCategory>('software')
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium')
  const [editSubmitted, setEditSubmitted] = useState(false)

  const [evalRating, setEvalRating] = useState(0)
  const [evalComment, setEvalComment] = useState('')
  const [evalSubmitted, setEvalSubmitted] = useState(false)

  const ticket = ticketStore.getTicketById(id || '')
  const records = ticketStore.getRecordsByTicketId(id || '')
  const mergedTickets = useMemo(
    () => (ticket ? ticketStore.getMergedTickets(ticket.id) : []),
    [ticket, ticketStore]
  )
  const mainTicket = useMemo(
    () => (ticket ? ticketStore.getMainTicket(ticket.id) : undefined),
    [ticket, ticketStore]
  )
  const isMerged = useMemo(
    () => (ticket ? ticketStore.isTicketMerged(ticket.id) : false),
    [ticket, ticketStore]
  )
  const following = ticket && currentUser ? isFollowing(ticket.id, currentUser.id) : false
  const evaluation = ticket ? ticketStore.getEvaluationByTicketId(ticket.id) : undefined

  const handleOpenEdit = () => {
    if (!ticket) return
    setEditTitle(ticket.title)
    setEditDescription(ticket.description)
    setEditCategory(ticket.category)
    setEditPriority(ticket.priority)
    setEditSubmitted(false)
    onEditOpen()
  }

  const editTitleError = editSubmitted && !editTitle.trim() ? '请输入工单标题' : ''
  const editDescriptionError = editSubmitted
    ? !editDescription.trim()
      ? '请输入工单描述'
      : editDescription.trim().length < 10
        ? '描述至少需要10个字符'
        : ''
    : ''

  const handleEditSubmit = () => {
    if (!ticket || !currentUser || isMerged) return
    setEditSubmitted(true)
    if (editTitleError || editDescriptionError) return

    ticketStore.editTicket(
      ticket.id,
      {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        priority: editPriority,
      },
      currentUser.id
    )
    toast({ title: '工单已更新', status: 'success', duration: 2000 })
    onEditClose()
  }

  const candidateTickets = useMemo(() => {
    if (!ticket) return []
    const s = mergeSearch.toLowerCase().trim()
    return ticketStore.tickets.filter(t => {
      if (t.id === ticket.id) return false
      if (t.status === 'merged') return false
      if ((t.mergedTicketIds ?? []).length > 0) return false
      if (s && !t.title.toLowerCase().includes(s) && !t.id.toLowerCase().includes(s)) return false
      return true
    }).slice(0, 20)
  }, [ticketStore.tickets, ticket, mergeSearch])

  if (!currentUser) return null

  const handleToggleFollow = () => {
    if (!ticket || !currentUser || isMerged) return
    if (following) {
      unfollowTicket(ticket.id, currentUser.id)
      toast({ title: '已取消关注', status: 'info', duration: 2000 })
    } else {
      followTicket(ticket.id, currentUser.id)
      toast({ title: '已关注该工单，状态变更时会收到通知', status: 'success', duration: 2000 })
    }
  }

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

  useEffect(() => {
    if (ticket?.departmentId) {
      setSelectedDepartmentId(ticket.departmentId)
    }
  }, [ticket?.id])

  const getUserName = (userId: string | null) => {
    if (!userId) return '未分配'
    const user = users.find(u => u.id === userId)
    return user ? user.name : '未知'
  }

  const agents = useMemo(() => {
    if (selectedDepartmentId) {
      return getAgentsByDepartment(selectedDepartmentId)
    }
    return users.filter(u => u.role === 'agent' || u.role === 'admin')
  }, [users, selectedDepartmentId, getAgentsByDepartment])

  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartmentId(deptId)
    if (deptId && assigneeId) {
      const deptAgentIds = getAgentsByDepartment(deptId).map(u => u.id)
      if (!deptAgentIds.includes(assigneeId)) {
        setAssigneeId('')
      }
    }
  }

  const handleAssignDepartment = () => {
    if (!selectedDepartmentId || isMerged) {
      toast({ title: '请选择部门', status: 'warning', duration: 2000 })
      return
    }
    ticketStore.assignDepartment(ticket.id, selectedDepartmentId, currentUser.id)
    toast({ title: '已指派部门', status: 'success', duration: 2000 })
  }

  const handleAssign = () => {
    if (!assigneeId || isMerged) {
      toast({ title: '请选择处理人', status: 'warning', duration: 2000 })
      return
    }
    if (selectedDepartmentId) {
      ticketStore.assignDepartment(ticket.id, selectedDepartmentId, currentUser.id)
    }
    ticketStore.assignTicket(ticket.id, assigneeId, currentUser.id)
    setAssigneeId('')
    toast({ title: '已分配处理人', status: 'success', duration: 2000 })
  }

  const handleStatusChange = (newStatus: TicketStatus, content: string) => {
    if (isMerged) return
    ticketStore.changeStatus(ticket.id, newStatus, currentUser.id, content)
    toast({ title: '状态已更新', status: 'success', duration: 2000 })
  }

  const handleAddComment = () => {
    if (!comment.trim() || isMerged) {
      toast({ title: '请输入备注内容', status: 'warning', duration: 2000 })
      return
    }
    ticketStore.addRecord(ticket.id, currentUser.id, 'comment', comment.trim())
    setComment('')
    toast({ title: '备注已添加', status: 'success', duration: 2000 })
  }

  const handleEvalSubmit = () => {
    if (!ticket || !currentUser) return
    setEvalSubmitted(true)
    if (evalRating < 1) {
      toast({ title: '请选择评分', status: 'warning', duration: 2000 })
      return
    }
    ticketStore.addEvaluation(ticket.id, evalRating, evalComment, currentUser.id)
    toast({ title: '评价已提交', status: 'success', duration: 2000 })
    setEvalRating(0)
    setEvalComment('')
    setEvalSubmitted(false)
  }

  const renderStars = (rating: number, interactive: boolean = false) => (
    <HStack spacing={1}>
      {Array.from({ length: MAX_RATING }, (_, i) => {
        const starValue = i + 1
        const filled = starValue <= rating
        return (
          <Icon
            key={i}
            as={Star}
            boxSize={interactive ? 7 : 5}
            color={filled ? '#F5B041' : 'gray.300'}
            fill={filled ? '#F5B041' : 'none'}
            cursor={interactive ? 'pointer' : 'default'}
            onClick={interactive ? () => setEvalRating(starValue) : undefined}
            _hover={interactive ? { transform: 'scale(1.15)' } : undefined}
            transition="all 0.15s ease"
          />
        )
      })}
    </HStack>
  )

  const toggleMergeSelect = (tid: string) => {
    setSelectedMergeIds(prev =>
      prev.includes(tid) ? prev.filter(i => i !== tid) : [...prev, tid]
    )
  }

  const handleConfirmMerge = () => {
    if (!ticket || selectedMergeIds.length === 0 || !currentUser) return
    if (ticketStore.isTicketMerged(ticket.id)) {
      toast({ title: '当前工单已被合并，无法作为主工单', status: 'error', duration: 3000 })
      return
    }
    ticketStore.mergeTickets(ticket.id, selectedMergeIds, currentUser.id)
    toast({ title: `已将 ${selectedMergeIds.length} 个工单合并到当前工单`, status: 'success', duration: 3000 })
    setSelectedMergeIds([])
    setMergeSearch('')
    onClose()
  }

  const renderActionPanel = () => {
    if (isMerged) {
      return (
        <VStack align="stretch" spacing={3}>
          <Card borderRadius="12px" bg="gray.50" border="1px solid" borderColor="gray.200">
            <CardBody py={3} px={4}>
              <HStack spacing={2}>
                <Icon as={AlertTriangle} color="gray.500" boxSize={5} />
                <VStack align="stretch" spacing={1} flex={1}>
                  <Text fontSize="sm" fontWeight="600" color="gray.600">
                    此工单已被合并
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    合并后工单为只读状态，所有操作已禁用
                  </Text>
                </VStack>
              </HStack>
              {mainTicket && (
                <Button
                  mt={3}
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                  leftIcon={<ExternalLink size={14} />}
                  onClick={() => navigate(`/tickets/${mainTicket.id}`)}
                  w="full"
                >
                  查看主工单 {mainTicket.id}
                </Button>
              )}
            </CardBody>
          </Card>
        </VStack>
      )
    }

    switch (ticket.status) {
      case 'pending':
        return (
          <VStack align="stretch" spacing={3}>
            <VStack align="stretch" spacing={2}>
              <Select
                placeholder="选择部门（先选部门可筛选人员）"
                value={selectedDepartmentId}
                onChange={e => handleDepartmentChange(e.target.value)}
                borderRadius="8px"
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </Select>
              <HStack>
                <Select
                  placeholder={selectedDepartmentId ? '选择部门内处理人（可选）' : '选择处理人（可选）'}
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  borderRadius="8px"
                  flex={1}
                  isDisabled={selectedDepartmentId && agents.length === 0}
                >
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </Select>
              </HStack>
              {selectedDepartmentId && agents.length === 0 && (
                <Text fontSize="xs" color="orange.500">该部门暂无处理人</Text>
              )}
            </VStack>
            <HStack>
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={handleAssignDepartment}
                flex={1}
                isDisabled={!selectedDepartmentId}
              >
                仅指派部门
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleAssign}
                flex={1}
                isDisabled={!assigneeId}
              >
                分配处理人
              </Button>
            </HStack>
            <Divider />
            <Button
              leftIcon={<Merge size={16} />}
              variant="outline"
              colorScheme="purple"
              onClick={onOpen}
              size="sm"
            >
              合并其他工单
            </Button>
          </VStack>
        )
      case 'assigned':
        return (
          <VStack align="stretch" spacing={3}>
            <Button
              colorScheme="purple"
              leftIcon={<Icon as={Play} />}
              onClick={() => handleStatusChange('in_progress', '开始处理工单')}
              w="full"
            >
              开始处理
            </Button>
            <Button
              leftIcon={<Merge size={16} />}
              variant="outline"
              colorScheme="purple"
              onClick={onOpen}
              size="sm"
            >
              合并其他工单
            </Button>
          </VStack>
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
            <Divider />
            <Button
              leftIcon={<Merge size={16} />}
              variant="outline"
              colorScheme="purple"
              onClick={onOpen}
              size="sm"
            >
              合并其他工单
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
            <Divider />
            <Button
              leftIcon={<Merge size={16} />}
              variant="outline"
              colorScheme="purple"
              onClick={onOpen}
              size="sm"
            >
              合并其他工单
            </Button>
          </VStack>
        )
      case 'closed':
        return (
          <VStack align="stretch" spacing={3}>
            <Text fontSize="sm" color="gray.500" textAlign="center" py={2}>已关闭</Text>
            <Button
              leftIcon={<Merge size={16} />}
              variant="outline"
              colorScheme="purple"
              onClick={onOpen}
              size="sm"
            >
              合并其他工单
            </Button>
          </VStack>
        )
      case 'rejected':
        return (
          <VStack align="stretch" spacing={3}>
            <Button
              colorScheme="orange"
              leftIcon={<Icon as={RotateCcw} />}
              onClick={() => handleStatusChange('in_progress', '重新处理工单')}
              w="full"
            >
              重新处理
            </Button>
            <Button
              leftIcon={<Merge size={16} />}
              variant="outline"
              colorScheme="purple"
              onClick={onOpen}
              size="sm"
            >
              合并其他工单
            </Button>
          </VStack>
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
        <Button
          variant="outline"
          colorScheme="gray"
          size="sm"
          leftIcon={<Icon as={Pencil} />}
          onClick={handleOpenEdit}
          borderRadius="8px"
          isDisabled={isMerged}
        >
          编辑
        </Button>
        <Button
          variant={following ? 'solid' : 'outline'}
          colorScheme={following ? 'blue' : 'gray'}
          size="sm"
          leftIcon={<Icon as={following ? BellOff : Bell} />}
          onClick={handleToggleFollow}
          borderRadius="8px"
          isDisabled={isMerged}
        >
          {following ? '取消关注' : '关注工单'}
        </Button>
        <StatusBadge status={ticket.status} size="md" />
      </Flex>

      {isMerged && mainTicket && (
        <Card borderRadius="16px" bg="blue.50" border="1px solid" borderColor="blue.200">
          <CardBody py={4} px={6}>
            <HStack spacing={3}>
              <Icon as={AlertTriangle} color="blue.500" boxSize={6} />
              <VStack align="stretch" spacing={1} flex={1}>
                <Text fontSize="sm" fontWeight="600" color="blue.700">
                  此工单已合并到主工单
                </Text>
                <Text fontSize="xs" color="blue.600">
                  当前工单为只读状态，已有的处理记录已全部汇总到主工单
                </Text>
              </VStack>
              <Button
                colorScheme="blue"
                size="sm"
                leftIcon={<ExternalLink size={14} />}
                onClick={() => navigate(`/tickets/${mainTicket.id}`)}
              >
                跳转到主工单
              </Button>
            </HStack>
          </CardBody>
        </Card>
      )}

      {mergedTickets.length > 0 && (
        <Card borderRadius="16px">
          <CardBody p={5}>
            <Text fontSize="sm" fontWeight="600" color="#2D3748" mb={3}>
              已合并工单（{mergedTickets.length} 个）
            </Text>
            <VStack align="stretch" spacing={2}>
              {mergedTickets.map(t => (
                <HStack
                  key={t.id}
                  p={3}
                  bg="gray.50"
                  borderRadius="8px"
                  cursor="pointer"
                  _hover={{ bg: 'gray.100' }}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <Badge colorScheme="purple">{t.id}</Badge>
                  <Text fontSize="sm" flex={1} isTruncated>{t.title}</Text>
                  <StatusBadge status={t.status} size="sm" />
                  <Icon as={ExternalLink} size={14} color="gray.400" />
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

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
                      <Text fontSize="sm" color="gray.500" w="80px" flexShrink={0}>所属部门</Text>
                      <Text fontSize="sm">{getDepartmentName(ticket.departmentId)}</Text>
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
          <Text fontSize="sm" fontWeight="600" color="#2D3748" mb={4}>
            处理记录
            {mergedTickets.length > 0 && (
              <Badge ml={2} colorScheme="purple" fontSize="xs">
                包含 {mergedTickets.length} 个合并工单的记录
              </Badge>
            )}
          </Text>
          <Timeline records={records} users={users} />
        </CardBody>
      </Card>

      {ticket.status === 'closed' && !isMerged && (
        <Card borderRadius="16px">
          <CardBody p={6}>
            <HStack mb={4} spacing={2}>
              <Icon as={Star} color="#F5B041" boxSize={5} fill="#F5B041" />
              <Text fontSize="sm" fontWeight="600" color="#2D3748">工单评价</Text>
            </HStack>
            {evaluation ? (
              <VStack align="stretch" spacing={3}>
                <HStack spacing={3}>
                  {renderStars(evaluation.rating)}
                  <Text fontSize="sm" color="#F5B041" fontWeight="600">
                    {evaluation.rating} 星
                  </Text>
                  <Badge colorScheme="yellow" fontSize="xs">{RATING_LABELS[evaluation.rating]}</Badge>
                </HStack>
                {evaluation.comment && (
                  <Box p={4} bg="gray.50" borderRadius="8px">
                    <Text fontSize="sm" color="#4A5568" lineHeight="1.8" whiteSpace="pre-wrap">
                      {evaluation.comment}
                    </Text>
                  </Box>
                )}
                <HStack spacing={2} fontSize="xs" color="gray.400">
                  <Text>评价人：{getUserName(evaluation.evaluatorId)}</Text>
                  <Text>·</Text>
                  <Text>{formatDateTime(evaluation.createdAt)}</Text>
                </HStack>
              </VStack>
            ) : currentUser.id === ticket.creatorId && ticket.assigneeId ? (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>请对本次处理进行评分</Text>
                  <HStack spacing={3}>
                    {renderStars(evalRating, true)}
                    {evalRating > 0 && (
                      <Text fontSize="sm" color="#F5B041" fontWeight="600">
                        {RATING_LABELS[evalRating]}
                      </Text>
                    )}
                  </HStack>
                  {evalSubmitted && evalRating < 1 && (
                    <Text fontSize="xs" color="red.500" mt={1}>请选择评分</Text>
                  )}
                </Box>
                <Textarea
                  value={evalComment}
                  onChange={e => setEvalComment(e.target.value)}
                  placeholder="写下您对本次处理的评价（选填）..."
                  borderRadius="8px"
                  rows={3}
                />
                <Button colorScheme="yellow" onClick={handleEvalSubmit} leftIcon={<Icon as={Star} />} w="full">
                  提交评价
                </Button>
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>
                提交人尚未评价
              </Text>
            )}
          </CardBody>
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>合并工单到当前工单</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.600">
                选择要合并到当前工单的工单。被合并的工单将变为只读状态，所有处理记录会汇总到当前工单。
              </Text>
              <Box>
                <Text fontSize="sm" fontWeight="600" mb={2}>搜索工单</Text>
                <Input
                  placeholder="输入工单编号或标题搜索..."
                  value={mergeSearch}
                  onChange={e => setMergeSearch(e.target.value)}
                  borderRadius="8px"
                />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="600" mb={2}>
                  选择要合并的工单
                  {selectedMergeIds.length > 0 && (
                    <Badge ml={2} colorScheme="blue">{selectedMergeIds.length} 个已选</Badge>
                  )}
                </Text>
                <VStack align="stretch" spacing={2} maxH="320px" overflowY="auto">
                  {candidateTickets.length === 0 ? (
                    <Text textAlign="center" py={8} color="gray.400" fontSize="sm">
                      没有可合并的工单
                    </Text>
                  ) : (
                    candidateTickets.map(t => (
                      <HStack
                        key={t.id}
                        p={3}
                        bg={selectedMergeIds.includes(t.id) ? 'purple.50' : 'gray.50'}
                        borderRadius="8px"
                        cursor="pointer"
                        border="1px solid"
                        borderColor={selectedMergeIds.includes(t.id) ? 'purple.200' : 'transparent'}
                        onClick={() => toggleMergeSelect(t.id)}
                      >
                        <Checkbox
                          isChecked={selectedMergeIds.includes(t.id)}
                          onChange={() => toggleMergeSelect(t.id)}
                          mr={2}
                        />
                        <Badge colorScheme="purple" flexShrink={0}>{t.id}</Badge>
                        <Text fontSize="sm" flex={1} isTruncated>{t.title}</Text>
                        <StatusBadge status={t.status} size="sm" />
                      </HStack>
                    ))
                  )}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              取消
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleConfirmMerge}
              isDisabled={selectedMergeIds.length === 0}
              leftIcon={<Merge size={16} />}
            >
              合并 {selectedMergeIds.length} 个工单
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>编辑工单</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isInvalid={!!editTitleError}>
                <FormLabel>标题</FormLabel>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="请输入工单标题"
                  borderRadius="8px"
                />
                {editTitleError && <FormErrorMessage>{editTitleError}</FormErrorMessage>}
              </FormControl>

              <FormControl isInvalid={!!editDescriptionError}>
                <FormLabel>描述</FormLabel>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="请详细描述问题（至少10个字符）"
                  minH="120px"
                  borderRadius="8px"
                />
                {editDescriptionError && <FormErrorMessage>{editDescriptionError}</FormErrorMessage>}
              </FormControl>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>分类</FormLabel>
                  <Select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as TicketCategory)}
                    borderRadius="8px"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>优先级</FormLabel>
                  <Select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                    borderRadius="8px"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <Card borderRadius="12px" bg="gray.50" border="1px solid" borderColor="gray.200">
                <CardBody py={3} px={4}>
                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={2}>
                      <Icon as={AlertTriangle} color="gray.500" boxSize={4} />
                      <Text fontSize="xs" fontWeight="600" color="gray.600">
                        以下字段不可修改
                      </Text>
                    </HStack>
                    <SimpleGrid columns={2} spacing={3} pt={1}>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500" w="60px" flexShrink={0}>状态</Text>
                        <StatusBadge status={ticket.status} size="sm" />
                      </HStack>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500" w="60px" flexShrink={0}>处理人</Text>
                        <Text fontSize="xs">{getUserName(ticket.assigneeId)}</Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500" w="60px" flexShrink={0}>创建人</Text>
                        <Text fontSize="xs">{getUserName(ticket.creatorId)}</Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500" w="60px" flexShrink={0}>创建时间</Text>
                        <Text fontSize="xs">{formatDateTime(ticket.createdAt)}</Text>
                      </HStack>
                    </SimpleGrid>
                  </VStack>
                </CardBody>
              </Card>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              取消
            </Button>
            <Button colorScheme="blue" onClick={handleEditSubmit} leftIcon={<Icon as={Pencil} size={16} />}>
              保存修改
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}
