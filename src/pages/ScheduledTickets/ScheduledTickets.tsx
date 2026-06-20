import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Input,
  Select,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  Spacer,
  Flex,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { Search, Plus, ChevronLeft, ChevronRight, CalendarClock, X, ExternalLink } from 'lucide-react'
import { useScheduledTicketStore } from '@/store/scheduledTicketStore'
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  SCHEDULED_STATUS_LABELS,
  SCHEDULED_STATUS_COLORS,
} from '@/types'
import { type ScheduledTicketStatus } from '@/types'

const PAGE_SIZE = 10

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`
}

export default function ScheduledTickets() {
  const navigate = useNavigate()
  const toast = useToast()
  const { scheduledTickets, cancelScheduledTicket } = useScheduledTicketStore()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [cancelId, setCancelId] = useState('')

  const filteredTickets = useMemo(() => {
    return scheduledTickets.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      }
      return true
    })
  }, [scheduledTickets, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, filteredTickets.length)
  const pageTickets = filteredTickets.slice(start, end)

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const cancelTarget = scheduledTickets.find((s) => s.id === cancelId)

  const handleCancelClick = (id: string) => {
    setCancelId(id)
    onOpen()
  }

  const handleConfirmCancel = () => {
    if (!cancelId) return
    cancelScheduledTicket(cancelId)
    toast({ title: '预约已取消', status: 'success', duration: 2000, isClosable: true })
    setCancelId('')
    onClose()
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Flex align="center">
        <Heading size="lg">预约工单</Heading>
        <Spacer />
        <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/tickets/create')}>
          创建预约工单
        </Button>
      </Flex>

      <HStack spacing={4}>
        <Box position="relative" flex="1">
          <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
            <Search size={16} />
          </Box>
          <Input
            placeholder="搜索预约工单标题或编号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            borderRadius="12px"
            pl="36px"
          />
        </Box>
        <Select
          placeholder="全部状态"
          value={statusFilter}
          onChange={(e) => updateStatusFilter(e.target.value)}
          borderRadius="12px"
          w="160px"
        >
          {(Object.keys(SCHEDULED_STATUS_LABELS) as ScheduledTicketStatus[]).map((s) => (
            <option key={s} value={s}>{SCHEDULED_STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </HStack>

      <Card borderRadius="16px">
        <CardBody p={0}>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>编号</Th>
                  <Th>标题</Th>
                  <Th>分类</Th>
                  <Th>优先级</Th>
                  <Th>生效时间</Th>
                  <Th>状态</Th>
                  <Th>创建时间</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pageTickets.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} textAlign="center" py={12}>
                      <VStack spacing={2}>
                        <CalendarClock size={32} color="#CBD5E0" />
                        <Text color="gray.400" fontSize="md">暂无预约工单</Text>
                      </VStack>
                    </Td>
                  </Tr>
                ) : (
                  pageTickets.map((ticket) => {
                    const statusColor = SCHEDULED_STATUS_COLORS[ticket.status]
                    return (
                      <Tr key={ticket.id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="600" color="brand.600">{ticket.id}</Td>
                        <Td maxW="240px" isTruncated>{ticket.title}</Td>
                        <Td>{CATEGORY_LABELS[ticket.category]}</Td>
                        <Td>
                          <HStack spacing={2}>
                            <Box w="8px" h="8px" borderRadius="50%" bg={PRIORITY_COLORS[ticket.priority]} flexShrink={0} />
                            <Text fontSize="sm">{PRIORITY_LABELS[ticket.priority]}</Text>
                          </HStack>
                        </Td>
                        <Td fontSize="sm" color="gray.500">{formatDateTime(ticket.scheduledTime)}</Td>
                        <Td>
                          <Badge borderRadius="8px" bg={`${statusColor}20`} color={statusColor} fontSize="xs" px={2} py={1}>
                            {SCHEDULED_STATUS_LABELS[ticket.status]}
                          </Badge>
                        </Td>
                        <Td fontSize="sm" color="gray.500">{formatDateTime(ticket.createdAt)}</Td>
                        <Td>
                          {ticket.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              leftIcon={<X size={14} />}
                              onClick={() => handleCancelClick(ticket.id)}
                            >
                              取消
                            </Button>
                          ) : ticket.status === 'created' && ticket.createdTicketId ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              colorScheme="brand"
                              rightIcon={<ExternalLink size={14} />}
                              onClick={() => navigate(`/tickets/${ticket.createdTicketId}`)}
                            >
                              {ticket.createdTicketId}
                            </Button>
                          ) : (
                            <Text fontSize="sm" color="gray.400">—</Text>
                          )}
                        </Td>
                      </Tr>
                    )
                  })
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      <Flex align="center">
        <Text fontSize="sm" color="gray.500">
          显示 {filteredTickets.length === 0 ? 0 : start + 1}-{end} 共 {filteredTickets.length} 条
        </Text>
        <Spacer />
        <HStack spacing={2}>
          <IconButton
            aria-label="上一页"
            icon={<ChevronLeft size={16} />}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            isDisabled={currentPage <= 1}
            size="sm"
            variant="outline"
          />
          <Text fontSize="sm" px={2}>
            {currentPage} / {totalPages}
          </Text>
          <IconButton
            aria-label="下一页"
            icon={<ChevronRight size={16} />}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            isDisabled={currentPage >= totalPages}
            size="sm"
            variant="outline"
          />
        </HStack>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>取消预约工单</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                确定要取消该预约工单吗？取消后将不会在生效时间自动创建工单，此操作不可撤销。
              </Text>
              {cancelTarget && (
                <Box p={3} borderRadius="8px" bg="gray.50">
                  <HStack mb={1}>
                    <Text fontSize="sm" fontWeight="600" color="brand.600">{cancelTarget.id}</Text>
                    <Badge
                      borderRadius="8px"
                      bg={`${SCHEDULED_STATUS_COLORS[cancelTarget.status]}20`}
                      color={SCHEDULED_STATUS_COLORS[cancelTarget.status]}
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      {SCHEDULED_STATUS_LABELS[cancelTarget.status]}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="500">{cancelTarget.title}</Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    生效时间：{formatDateTime(cancelTarget.scheduledTime)}
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              再想想
            </Button>
            <Button colorScheme="red" leftIcon={<X size={16} />} onClick={handleConfirmCancel}>
              确认取消
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}
