import { useState, useMemo, useRef } from 'react'
import { useTicketStore, DELETED_RETENTION_DAYS } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogContent,
  Alert,
  AlertIcon,
  useDisclosure,
  useToast,
  Badge,
} from '@chakra-ui/react'
import { Search, Trash2, RotateCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import TagBadge from '@/components/TagBadge/TagBadge'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS } from '@/types'
import { type TicketPriority, type TicketCategory } from '@/types'

type SortField = 'deletedAt' | 'priority' | 'daysRemaining'
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

export default function RecycleBin() {
  const { tickets, getDeletedTickets, restoreTicket, permanentlyDeleteTicket, getDaysUntilExpiration } = useTicketStore()
  const { users, currentUser } = useUserStore()
  const toast = useToast()
  const { isOpen: isRestoreOpen, onOpen: onRestoreOpen, onClose: onRestoreClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const { isOpen: isBatchRestoreOpen, onOpen: onBatchRestoreOpen, onClose: onBatchRestoreClose } = useDisclosure()
  const { isOpen: isBatchDeleteOpen, onOpen: onBatchDeleteOpen, onClose: onBatchDeleteClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('deletedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [actionTicketId, setActionTicketId] = useState('')

  const deletedTickets = useMemo(() => {
    return getDeletedTickets()
  }, [tickets, getDeletedTickets])

  const filteredTickets = useMemo(() => {
    let result = [...deletedTickets]

    if (search.trim()) {
      const s = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(s) ||
        t.id.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s)
      )
    }

    if (categoryFilter) {
      result = result.filter(t => t.category === categoryFilter)
    }

    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'deletedAt':
          comparison = new Date(a.deletedAt!).getTime() - new Date(b.deletedAt!).getTime()
          break
        case 'priority':
          comparison = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
          break
        case 'daysRemaining':
          comparison = getDaysUntilExpiration(a.deletedAt!) - getDaysUntilExpiration(b.deletedAt!)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [deletedTickets, search, categoryFilter, priorityFilter, sortField, sortOrder, getDaysUntilExpiration])

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
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const selectableIds = pageTickets.map(t => t.id)
    const allSelected = selectableIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...selectableIds])])
    }
  }

  const getExpirationBadge = (deletedAt: string) => {
    const days = getDaysUntilExpiration(deletedAt)
    if (days <= 3) {
      return <Badge colorScheme="red">剩余 {days} 天</Badge>
    } else if (days <= 7) {
      return <Badge colorScheme="orange">剩余 {days} 天</Badge>
    }
    return <Badge colorScheme="green">剩余 {days} 天</Badge>
  }

  const handleRestoreClick = (ticketId: string) => {
    setActionTicketId(ticketId)
    onRestoreOpen()
  }

  const handleConfirmRestore = () => {
    if (!currentUser || !actionTicketId) return
    const success = restoreTicket(actionTicketId, currentUser.id)
    if (success) {
      toast({ title: '工单已恢复', status: 'success', duration: 2000 })
      setSelectedIds(prev => prev.filter(id => id !== actionTicketId))
    } else {
      toast({ title: '恢复失败', status: 'error', duration: 2000 })
    }
    setActionTicketId('')
    onRestoreClose()
  }

  const handleDeleteClick = (ticketId: string) => {
    setActionTicketId(ticketId)
    onDeleteOpen()
  }

  const handleConfirmDelete = () => {
    if (!actionTicketId) return
    const success = permanentlyDeleteTicket(actionTicketId)
    if (success) {
      toast({ title: '工单已永久删除', status: 'success', duration: 2000 })
      setSelectedIds(prev => prev.filter(id => id !== actionTicketId))
    } else {
      toast({ title: '删除失败', status: 'error', duration: 2000 })
    }
    setActionTicketId('')
    onDeleteClose()
  }

  const handleBatchRestore = () => {
    if (selectedIds.length === 0) {
      toast({ title: '请先选择工单', status: 'warning', duration: 2000 })
      return
    }
    onBatchRestoreOpen()
  }

  const handleConfirmBatchRestore = () => {
    if (!currentUser) return
    let successCount = 0
    selectedIds.forEach(id => {
      if (restoreTicket(id, currentUser.id)) {
        successCount++
      }
    })
    toast({ title: `已恢复 ${successCount} 个工单`, status: 'success', duration: 2000 })
    setSelectedIds([])
    onBatchRestoreClose()
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toast({ title: '请先选择工单', status: 'warning', duration: 2000 })
      return
    }
    onBatchDeleteOpen()
  }

  const handleConfirmBatchDelete = () => {
    let successCount = 0
    selectedIds.forEach(id => {
      if (permanentlyDeleteTicket(id)) {
        successCount++
      }
    })
    toast({ title: `已永久删除 ${successCount} 个工单`, status: 'success', duration: 2000 })
    setSelectedIds([])
    onBatchDeleteClose()
  }

  const allSelected = pageTickets.length > 0 && pageTickets.every(t => selectedIds.includes(t.id))

  return (
    <VStack align="stretch" spacing={6}>
      <Flex align="center">
        <Heading size="lg">工单回收站</Heading>
        <Spacer />
        <HStack spacing={3}>
          {selectedIds.length > 0 && (
            <>
              <Badge colorScheme="blue" px={3} py={1} borderRadius="8px">
                已选 {selectedIds.length} 项
              </Badge>
              <Button
                leftIcon={<RotateCcw size={16} />}
                variant="outline"
                colorScheme="green"
                onClick={handleBatchRestore}
              >
                批量恢复
              </Button>
              <Button
                leftIcon={<Trash2 size={16} />}
                variant="outline"
                colorScheme="red"
                onClick={handleBatchDelete}
              >
                批量彻底删除
              </Button>
            </>
          )}
        </HStack>
      </Flex>

      <Alert status="info" borderRadius="12px">
        <AlertIcon />
        <VStack align="stretch" spacing={1} flex={1}>
          <Text fontSize="sm" fontWeight="600">回收站说明</Text>
          <Text fontSize="sm">
            被删除的工单会在此保留 <Text as="span" fontWeight="700">{DELETED_RETENTION_DAYS}</Text> 天，
            到期后将被自动永久删除。您可以在此恢复工单或手动永久删除。
          </Text>
        </VStack>
      </Alert>

      <HStack spacing={4}>
        <Box position="relative" flex="1">
          <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
            <Search size={16} />
          </Box>
          <Input
            placeholder="搜索工单标题、编号或描述..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            borderRadius="12px"
            pl="36px"
          />
        </Box>
        <Select
          placeholder="全部分类"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value as TicketCategory || ''); setPage(1) }}
          borderRadius="12px"
          w="150px"
        >
          {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </Select>
        <Select
          placeholder="全部优先级"
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value as TicketPriority || ''); setPage(1) }}
          borderRadius="12px"
          w="150px"
        >
          {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
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
                      isIndeterminate={!allSelected && selectedIds.some(id => pageTickets.some(t => t.id === id))}
                      onChange={toggleSelectAll}
                    />
                  </Th>
                  <Th>编号</Th>
                  <Th>标题</Th>
                  <Th>分类</Th>
                  <Th>标签</Th>
                  <Th>优先级</Th>
                  <Th>状态</Th>
                  <Th>删除人</Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('deletedAt')}
                    userSelect="none"
                    _hover={{ color: 'brand.600' }}
                  >
                    <HStack spacing={1}>
                      <Text>删除时间</Text>
                      {renderSortIcon('deletedAt')}
                    </HStack>
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('daysRemaining')}
                    userSelect="none"
                    _hover={{ color: 'brand.600' }}
                  >
                    <HStack spacing={1}>
                      <Text>保留期限</Text>
                      {renderSortIcon('daysRemaining')}
                    </HStack>
                  </Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pageTickets.length === 0 ? (
                  <Tr>
                    <Td colSpan={11} textAlign="center" py={12}>
                      <Text color="gray.400" fontSize="md">回收站为空</Text>
                    </Td>
                  </Tr>
                ) : (
                  pageTickets.map(ticket => (
                    <Tr
                      key={ticket.id}
                      opacity={0.8}
                      _hover={{ bg: 'gray.50' }}
                    >
                      <Td>
                        <Checkbox
                          isChecked={selectedIds.includes(ticket.id)}
                          onChange={() => toggleSelect(ticket.id)}
                        />
                      </Td>
                      <Td fontWeight="600" color="gray.500">
                        {ticket.id}
                      </Td>
                      <Td maxW="280px">
                        <Box isTruncated color="gray.700">{ticket.title}</Box>
                      </Td>
                      <Td>{CATEGORY_LABELS[ticket.category]}</Td>
                      <Td>
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
                      <Td>{getUserName(ticket.deletedBy)}</Td>
                      <Td fontSize="sm" color="gray.500">{formatDateTime(ticket.deletedAt!)}</Td>
                      <Td>
                        {getExpirationBadge(ticket.deletedAt!)}
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          <IconButton
                            aria-label="恢复工单"
                            icon={<RotateCcw size={14} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            onClick={() => handleRestoreClick(ticket.id)}
                          />
                          <IconButton
                            aria-label="彻底删除"
                            icon={<Trash2 size={14} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDeleteClick(ticket.id)}
                          />
                        </HStack>
                      </Td>
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

      <AlertDialog
        isOpen={isRestoreOpen}
        leastDestructiveRef={cancelRef}
        onClose={onRestoreClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="16px">
            <AlertDialogHeader fontSize="lg" fontWeight="600">
              确认恢复工单
            </AlertDialogHeader>
            <AlertDialogBody>
              <VStack align="stretch" spacing={4}>
                <Alert status="info" borderRadius="8px">
                  <AlertIcon />
                  <Text fontSize="sm">
                    工单 <Text as="span" fontWeight="700">{actionTicketId}</Text> 将被恢复到工单列表中。
                  </Text>
                </Alert>
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onRestoreClose}>
                取消
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<RotateCcw size={16} />}
                onClick={handleConfirmRestore}
                ml={3}
              >
                确认恢复
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="16px">
            <AlertDialogHeader fontSize="lg" fontWeight="600">
              确认永久删除
            </AlertDialogHeader>
            <AlertDialogBody>
              <VStack align="stretch" spacing={4}>
                <Alert status="warning" borderRadius="8px">
                  <AlertIcon />
                  <Text fontSize="sm">
                    此操作不可撤销！工单 <Text as="span" fontWeight="700">{actionTicketId}</Text> 及其所有关联数据（记录、附件、评论、评价）将被永久删除。
                  </Text>
                </Alert>
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                取消
              </Button>
              <Button
                colorScheme="red"
                leftIcon={<Trash2 size={16} />}
                onClick={handleConfirmDelete}
                ml={3}
              >
                确认永久删除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isBatchRestoreOpen}
        leastDestructiveRef={cancelRef}
        onClose={onBatchRestoreClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="16px">
            <AlertDialogHeader fontSize="lg" fontWeight="600">
              确认批量恢复
            </AlertDialogHeader>
            <AlertDialogBody>
              <VStack align="stretch" spacing={4}>
                <Alert status="info" borderRadius="8px">
                  <AlertIcon />
                  <Text fontSize="sm">
                    即将恢复选中的 <Text as="span" fontWeight="700">{selectedIds.length}</Text> 个工单到工单列表中。
                  </Text>
                </Alert>
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onBatchRestoreClose}>
                取消
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<RotateCcw size={16} />}
                onClick={handleConfirmBatchRestore}
                ml={3}
              >
                确认恢复 ({selectedIds.length})
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isBatchDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onBatchDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="16px">
            <AlertDialogHeader fontSize="lg" fontWeight="600">
              确认批量永久删除
            </AlertDialogHeader>
            <AlertDialogBody>
              <VStack align="stretch" spacing={4}>
                <Alert status="warning" borderRadius="8px">
                  <AlertIcon />
                  <Text fontSize="sm">
                    此操作不可撤销！选中的 <Text as="span" fontWeight="700">{selectedIds.length}</Text> 个工单及其所有关联数据将被永久删除。
                  </Text>
                </Alert>
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onBatchDeleteClose}>
                取消
              </Button>
              <Button
                colorScheme="red"
                leftIcon={<Trash2 size={16} />}
                onClick={handleConfirmBatchDelete}
                ml={3}
              >
                确认永久删除 ({selectedIds.length})
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  )
}
