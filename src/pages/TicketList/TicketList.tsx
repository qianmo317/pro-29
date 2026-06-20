import { useState, useMemo } from 'react'
import { useTicketStore, type TicketFilters } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
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
} from '@chakra-ui/react'
import { Search, Plus, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import SLAIndicator from '@/components/SLAIndicator/SLAIndicator'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS, STATUS_LABELS } from '@/types'
import { type TicketStatus, type TicketPriority, type TicketCategory } from '@/types'

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

export default function TicketList() {
  const navigate = useNavigate()
  const { tickets } = useTicketStore()
  const { users } = useUserStore()

  const [filters, setFilters] = useState<TicketFilters>({})
  const [page, setPage] = useState(1)

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filters.status && t.status !== filters.status) return false
      if (filters.priority && t.priority !== filters.priority) return false
      if (filters.category && t.category !== filters.category) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        return t.title.toLowerCase().includes(s) || t.id.toLowerCase().includes(s)
      }
      return true
    })
  }, [tickets, filters])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, filteredTickets.length)
  const pageTickets = filteredTickets.slice(start, end)

  const getUserName = (id: string | null) => {
    if (!id) return '未分配'
    const user = users.find(u => u.id === id)
    return user ? user.name : '未分配'
  }

  const updateFilter = <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setPage(1)
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Flex align="center">
        <Heading size="lg">工单管理</Heading>
        <Spacer />
        <HStack spacing={3}>
          <Button
            leftIcon={<Upload size={16} />}
            variant="outline"
            onClick={() => navigate('/tickets/import')}
          >
            批量导入
          </Button>
          <Button
            leftIcon={<Plus size={16} />}
            onClick={() => navigate('/tickets/create')}
          >
            创建工单
          </Button>
        </HStack>
      </Flex>

      <HStack spacing={4}>
        <Box position="relative" flex="1">
          <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
            <Search size={16} />
          </Box>
          <Input
            placeholder="搜索工单标题或编号..."
            value={filters.search || ''}
            onChange={e => updateFilter('search', e.target.value)}
            borderRadius="12px"
            pl="36px"
          />
        </Box>
        <Select
          placeholder="全部状态"
          value={filters.status || ''}
          onChange={e => updateFilter('status', e.target.value as TicketStatus || undefined)}
          borderRadius="12px"
          w="150px"
        >
          {(Object.keys(STATUS_LABELS) as TicketStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select
          placeholder="全部优先级"
          value={filters.priority || ''}
          onChange={e => updateFilter('priority', e.target.value as TicketPriority || undefined)}
          borderRadius="12px"
          w="150px"
        >
          {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </Select>
        <Select
          placeholder="全部分类"
          value={filters.category || ''}
          onChange={e => updateFilter('category', e.target.value as TicketCategory || undefined)}
          borderRadius="12px"
          w="150px"
        >
          {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
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
                  <Th>状态</Th>
                  <Th>处理人</Th>
                  <Th>创建时间</Th>
                  <Th>SLA</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pageTickets.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} textAlign="center" py={12}>
                      <Text color="gray.400" fontSize="md">暂无匹配的工单</Text>
                    </Td>
                  </Tr>
                ) : (
                  pageTickets.map(ticket => (
                    <Tr
                      key={ticket.id}
                      cursor="pointer"
                      _hover={{ bg: 'brand.50' }}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <Td fontWeight="600" color="brand.600">{ticket.id}</Td>
                      <Td maxW="240px" isTruncated>{ticket.title}</Td>
                      <Td>{CATEGORY_LABELS[ticket.category]}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <Box w="8px" h="8px" borderRadius="50%" bg={PRIORITY_COLORS[ticket.priority]} flexShrink={0} />
                          <Text fontSize="sm">{PRIORITY_LABELS[ticket.priority]}</Text>
                        </HStack>
                      </Td>
                      <Td><StatusBadge status={ticket.status} size="sm" /></Td>
                      <Td>{getUserName(ticket.assigneeId)}</Td>
                      <Td fontSize="sm" color="gray.500">{formatDateTime(ticket.createdAt)}</Td>
                      <Td><SLAIndicator slaDeadline={ticket.slaDeadline} size="sm" /></Td>
                    </Tr>
                  ))
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
            onClick={() => setPage(p => Math.max(1, p - 1))}
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
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            isDisabled={currentPage >= totalPages}
            size="sm"
            variant="outline"
          />
        </HStack>
      </Flex>
    </VStack>
  )
}
