import { useState, useMemo } from 'react'
import { useTicketStore, type TicketFilters } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import { useDepartmentStore } from '@/store/departmentStore'
import { useTagStore } from '@/store/tagStore'
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
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Badge,
} from '@chakra-ui/react'
import { Search, Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Upload, Merge, Tags } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import SLAIndicator from '@/components/SLAIndicator/SLAIndicator'
import TagBadge from '@/components/TagBadge/TagBadge'
import TagManageModal from '@/components/TagManageModal/TagManageModal'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS, STATUS_LABELS } from '@/types'
import { type TicketStatus, type TicketPriority, type TicketCategory, type Ticket } from '@/types'

type SortField = 'createdAt' | 'priority' | 'slaDeadline'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE = 10
const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

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
  const { tickets, mergeTickets, isTicketMerged, getFilteredTickets } = useTicketStore()
  const { users, currentUser } = useUserStore()
  const { departments, getDepartmentName } = useDepartmentStore()
  const tags = useTagStore((s) => s.tags)
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isTagOpen, onOpen: onTagOpen, onClose: onTagClose } = useDisclosure()

  const [filters, setFilters] = useState<TicketFilters>({})
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mainTicketId, setMainTicketId] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const filteredTickets = useMemo(() => {
    const result = getFilteredTickets(filters)

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'priority':
          comparison = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
          break
        case 'slaDeadline':
          comparison = new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [getFilteredTickets, filters, sortField, sortOrder])

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp size={14} opacity={0.3} />
    }
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const toggleSelect = (id: string) => {
    if (isTicketMerged(id)) return
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const selectableIds = pageTickets.filter(t => !isTicketMerged(t.id)).map(t => t.id)
    const allSelected = selectableIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...selectableIds])])
    }
  }

  const canMerge = selectedIds.length >= 2

  const handleMergeClick = () => {
    if (!canMerge) {
      toast({ title: '请至少选择 2 个工单进行合并', status: 'warning', duration: 2000 })
      return
    }
    setMainTicketId(selectedIds[0])
    onOpen()
  }

  const handleConfirmMerge = () => {
    if (!mainTicketId || !currentUser) return
    if (isTicketMerged(mainTicketId)) {
      toast({ title: '主工单已被合并，无法作为主工单', status: 'error', duration: 3000 })
      return
    }
    const mergedIds = selectedIds.filter(id => id !== mainTicketId)
    if (mergedIds.length === 0) {
      toast({ title: '请选择要合并的工单', status: 'warning', duration: 2000 })
      return
    }
    mergeTickets(mainTicketId, mergedIds, currentUser.id)
    toast({ title: `已将 ${mergedIds.length} 个工单合并到 ${mainTicketId}`, status: 'success', duration: 3000 })
    setSelectedIds([])
    setMainTicketId('')
    onClose()
  }

  const selectedTickets = selectedIds.map(id => tickets.find(t => t.id === id)).filter((t): t is Ticket => !!t)

  const selectableCount = pageTickets.filter(t => !isTicketMerged(t.id)).length
  const allSelected = selectableCount > 0 && pageTickets.filter(t => !isTicketMerged(t.id)).every(t => selectedIds.includes(t.id))

  return (
    <VStack align="stretch" spacing={6}>
      <Flex align="center">
        <Heading size="lg">工单管理</Heading>
        <Spacer />
        <HStack spacing={3}>
          {selectedIds.length > 0 && (
            <Badge colorScheme="blue" px={3} py={1} borderRadius="8px">
              已选 {selectedIds.length} 项
            </Badge>
          )}
          <Button
            leftIcon={<Tags size={16} />}
            variant="outline"
            onClick={onTagOpen}
          >
            标签管理
          </Button>
          <Button
            leftIcon={<Merge size={16} />}
            variant="outline"
            colorScheme="purple"
            onClick={handleMergeClick}
            isDisabled={!canMerge}
          >
            合并工单
          </Button>
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
        <Select
          placeholder="全部部门"
          value={filters.departmentId || ''}
          onChange={e => updateFilter('departmentId', e.target.value || undefined)}
          borderRadius="12px"
          w="150px"
        >
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select
          placeholder="全部标签"
          value={filters.tagId || ''}
          onChange={e => updateFilter('tagId', e.target.value || undefined)}
          borderRadius="12px"
          w="150px"
        >
          {tags.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </HStack>

      <Card borderRadius="16px">
        <CardBody p={0}>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th w="40px">
                    <Checkbox
                      isChecked={allSelected}
                      isIndeterminate={!allSelected && selectedIds.some(id => pageTickets.some(t => t.id === id && !isTicketMerged(t.id)))}
                      onChange={toggleSelectAll}
                    />
                  </Th>
                  <Th>编号</Th>
                  <Th>标题</Th>
                  <Th>分类</Th>
                  <Th>标签</Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('priority')}
                    userSelect="none"
                    _hover={{ color: 'brand.600' }}
                  >
                    <HStack spacing={1}>
                      <Text>优先级</Text>
                      {renderSortIcon('priority')}
                    </HStack>
                  </Th>
                  <Th>状态</Th>
                  <Th>所属部门</Th>
                  <Th>处理人</Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('createdAt')}
                    userSelect="none"
                    _hover={{ color: 'brand.600' }}
                  >
                    <HStack spacing={1}>
                      <Text>创建时间</Text>
                      {renderSortIcon('createdAt')}
                    </HStack>
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('slaDeadline')}
                    userSelect="none"
                    _hover={{ color: 'brand.600' }}
                  >
                    <HStack spacing={1}>
                      <Text>SLA</Text>
                      {renderSortIcon('slaDeadline')}
                    </HStack>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {pageTickets.length === 0 ? (
                  <Tr>
                    <Td colSpan={11} textAlign="center" py={12}>
                      <Text color="gray.400" fontSize="md">暂无匹配的工单</Text>
                    </Td>
                  </Tr>
                ) : (
                  pageTickets.map(ticket => {
                    const isMerged = isTicketMerged(ticket.id)
                    const isSelected = selectedIds.includes(ticket.id)
                    return (
                      <Tr
                        key={ticket.id}
                        cursor={isMerged ? 'not-allowed' : 'pointer'}
                        opacity={isMerged ? 0.6 : 1}
                        _hover={{ bg: isMerged ? 'gray.50' : 'brand.50' }}
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <Td onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            isChecked={isSelected}
                            isDisabled={isMerged}
                            onChange={() => toggleSelect(ticket.id)}
                          />
                        </Td>
                        <Td fontWeight="600" color={isMerged ? 'gray.400' : 'brand.600'}>
                          {ticket.id}
                          {ticket.mergedToId && (
                            <Badge ml={2} colorScheme="gray" fontSize="xs">已合并</Badge>
                          )}
                          {(ticket.mergedTicketIds ?? []).length > 0 && (
                            <Badge ml={2} colorScheme="purple" fontSize="xs">
                              含{(ticket.mergedTicketIds ?? []).length}个合并
                            </Badge>
                          )}
                        </Td>
                        <Td maxW="240px" isTruncated>{ticket.title}</Td>
                        <Td>{CATEGORY_LABELS[ticket.category]}</Td>
                        <Td onClick={(e) => e.stopPropagation()}>
                          {(ticket.tags ?? []).length > 0 ? (
                            <HStack spacing={1} flexWrap="wrap" maxW="180px">
                              {(ticket.tags ?? []).slice(0, 2).map(tid => (
                                <TagBadge key={tid} tagId={tid} />
                              ))}
                              {(ticket.tags ?? []).length > 2 && (
                                <Text fontSize="xs" color="gray.400">
                                  +{(ticket.tags ?? []).length - 2}
                                </Text>
                              )}
                            </HStack>
                          ) : (
                            <Text fontSize="sm" color="gray.300">—</Text>
                          )}
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <Box w="8px" h="8px" borderRadius="50%" bg={PRIORITY_COLORS[ticket.priority]} flexShrink={0} />
                            <Text fontSize="sm">{PRIORITY_LABELS[ticket.priority]}</Text>
                          </HStack>
                        </Td>
                        <Td><StatusBadge status={ticket.status} size="sm" /></Td>
                        <Td>{getDepartmentName(ticket.departmentId)}</Td>
                        <Td>{getUserName(ticket.assigneeId)}</Td>
                        <Td fontSize="sm" color="gray.500">{formatDateTime(ticket.createdAt)}</Td>
                        <Td><SLAIndicator slaDeadline={ticket.slaDeadline} size="sm" /></Td>
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

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>合并工单</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.600">
                选择一个主工单，其他工单将被合并到该工单下。合并后被合并的工单将变为只读状态，所有处理记录会汇总到主工单。
              </Text>
              <Box>
                <Text fontSize="sm" fontWeight="600" mb={2}>主工单（保留信息）</Text>
                <Select
                  value={mainTicketId}
                  onChange={e => setMainTicketId(e.target.value)}
                  borderRadius="8px"
                >
                  {selectedTickets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.id} - {t.title}
                    </option>
                  ))}
                </Select>
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="600" mb={2}>
                  被合并工单（共 {selectedTickets.filter(t => t.id !== mainTicketId).length} 个）
                </Text>
                <VStack align="stretch" spacing={2} maxH="300px" overflowY="auto">
                  {selectedTickets.filter(t => t.id !== mainTicketId).map(t => (
                    <Card key={t.id} borderRadius="8px" bg="gray.50">
                      <CardBody py={2} px={3}>
                        <HStack>
                          <Text fontSize="sm" fontWeight="600" color="gray.600">{t.id}</Text>
                          <Text fontSize="sm" isTruncated>{t.title}</Text>
                          <Spacer />
                          <StatusBadge status={t.status} size="sm" />
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              取消
            </Button>
            <Button colorScheme="purple" onClick={handleConfirmMerge}>
              确认合并
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <TagManageModal isOpen={isTagOpen} onClose={onTagClose} />
    </VStack>
  )
}
