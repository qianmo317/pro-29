import { useState, useMemo, useRef } from 'react'
import { useTicketStore, ARCHIVE_AFTER_DAYS } from '@/store/ticketStore'
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import { Search, Archive, Undo2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, FileText } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge/StatusBadge'
import TagBadge from '@/components/TagBadge/TagBadge'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS } from '@/types'
import { type TicketPriority, type TicketCategory, type BatchOperationResult } from '@/types'

type SortField = 'archivedAt' | 'priority' | 'updatedAt'
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

export default function ArchivedTickets() {
  const { getArchivedTickets, unarchiveTicket, getTicketsEligibleForArchive, batchArchiveTickets, archiveTicket } = useTicketStore()
  const { users, currentUser } = useUserStore()
  const toast = useToast()
  const { isOpen: isUnarchiveOpen, onOpen: onUnarchiveOpen, onClose: onUnarchiveClose } = useDisclosure()
  const { isOpen: isBatchUnarchiveOpen, onOpen: onBatchUnarchiveOpen, onClose: onBatchUnarchiveClose } = useDisclosure()
  const { isOpen: isArchiveEligibleOpen, onOpen: onArchiveEligibleOpen, onClose: onArchiveEligibleClose } = useDisclosure()
  const { isOpen: isBatchResultOpen, onOpen: onBatchResultOpen, onClose: onBatchResultClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('archivedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [actionTicketId, setActionTicketId] = useState('')
  const [batchResult, setBatchResult] = useState<BatchOperationResult | null>(null)
  const [eligibleSelectedIds, setEligibleSelectedIds] = useState<string[]>([])

  const archivedTickets = useMemo(() => {
    return getArchivedTickets()
  }, [getArchivedTickets])

  const eligibleForArchive = useMemo(() => {
    return getTicketsEligibleForArchive()
  }, [getTicketsEligibleForArchive])

  const filteredTickets = useMemo(() => {
    let result = [...archivedTickets]

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
        case 'archivedAt':
          comparison = new Date(a.archivedAt!).getTime() - new Date(b.archivedAt!).getTime()
          break
        case 'priority':
          comparison = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [archivedTickets, search, categoryFilter, priorityFilter, sortField, sortOrder])

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

  const toggleEligibleSelect = (id: string) => {
    setEligibleSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleEligibleSelectAll = () => {
    const selectableIds = eligibleForArchive.map(t => t.id)
    const allSelected = selectableIds.every(id => eligibleSelectedIds.includes(id))
    if (allSelected) {
      setEligibleSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)))
    } else {
      setEligibleSelectedIds(prev => [...new Set([...prev, ...selectableIds])])
    }
  }

  const handleUnarchiveClick = (ticketId: string) => {
    setActionTicketId(ticketId)
    onUnarchiveOpen()
  }

  const handleConfirmUnarchive = () => {
    if (!currentUser || !actionTicketId) return
    const success = unarchiveTicket(actionTicketId, currentUser.id)
    if (success) {
      toast({ title: '工单已从归档恢复', status: 'success', duration: 2000 })
      setSelectedIds(prev => prev.filter(id => id !== actionTicketId))
    } else {
      toast({ title: '恢复失败', status: 'error', duration: 2000 })
    }
    setActionTicketId('')
    onUnarchiveClose()
  }

  const handleBatchUnarchive = () => {
    if (selectedIds.length === 0) {
      toast({ title: '请先选择工单', status: 'warning', duration: 2000 })
      return
    }
    onBatchUnarchiveOpen()
  }

  const handleConfirmBatchUnarchive = () => {
    if (!currentUser) return
    let successCount = 0
    selectedIds.forEach(id => {
      if (unarchiveTicket(id, currentUser.id)) {
        successCount++
      }
    })
    toast({ title: `已恢复 ${successCount} 个工单`, status: 'success', duration: 2000 })
    setSelectedIds([])
    onBatchUnarchiveClose()
  }

  const handleArchiveEligible = () => {
    setEligibleSelectedIds([])
    onArchiveEligibleOpen()
  }

  const handleConfirmManualArchive = (ticketId: string) => {
    if (!currentUser) return
    const success = archiveTicket(ticketId, currentUser.id)
    if (success) {
      toast({ title: '工单已归档', status: 'success', duration: 2000 })
    } else {
      toast({ title: '归档失败', status: 'error', duration: 2000 })
    }
  }

  const handleBatchArchiveEligible = () => {
    if (!currentUser) return
    const idsToArchive = eligibleSelectedIds.length > 0 ? eligibleSelectedIds : eligibleForArchive.map(t => t.id)
    if (idsToArchive.length === 0) {
      toast({ title: '没有可归档的工单', status: 'warning', duration: 2000 })
      return
    }
    const result = batchArchiveTickets(idsToArchive, currentUser.id)
    setBatchResult(result)
    if (result.failed === 0) {
      toast({ title: `成功归档 ${result.success} 个工单`, status: 'success', duration: 2000 })
    } else if (result.success === 0) {
      toast({ title: '归档失败', status: 'error', duration: 3000 })
    } else {
      toast({ title: `归档 ${result.success} 个，${result.failed} 个失败`, status: 'warning', duration: 3000 })
    }
    setEligibleSelectedIds([])
    onArchiveEligibleClose()
    if (result.failed > 0) {
      onBatchResultOpen()
    }
  }

  const allSelected = pageTickets.length > 0 && pageTickets.every(t => selectedIds.includes(t.id))
  const allEligibleSelected = eligibleForArchive.length > 0 && eligibleForArchive.every(t => eligibleSelectedIds.includes(t.id))

  return (
    <VStack align="stretch" spacing={6}>
      <Flex align="center">
        <Heading size="lg">归档工单</Heading>
        <Spacer />
        <HStack spacing={3}>
          {eligibleForArchive.length > 0 && (
            <Button
              leftIcon={<Archive size={16} />}
              colorScheme="blue"
              onClick={handleArchiveEligible}
            >
              归档待处理 ({eligibleForArchive.length})
            </Button>
          )}
          {selectedIds.length > 0 && (
            <>
              <Badge colorScheme="blue" px={3} py={1} borderRadius="8px">
                已选 {selectedIds.length} 项
              </Badge>
              <Button
                leftIcon={<Undo2 size={16} />}
                variant="outline"
                colorScheme="green"
                onClick={handleBatchUnarchive}
              >
                批量恢复
              </Button>
            </>
          )}
        </HStack>
      </Flex>

      <Alert status="info" borderRadius="12px">
        <AlertIcon />
        <VStack align="stretch" spacing={1} flex={1}>
          <Text fontSize="sm" fontWeight="600">归档说明</Text>
          <Text fontSize="sm">
            已关闭超过 <Text as="span" fontWeight="700">{ARCHIVE_AFTER_DAYS}</Text> 天的工单会被自动归档以提升列表加载速度。
            您可以在此查看归档工单、手动恢复或进行归档操作。
          </Text>
        </VStack>
      </Alert>

      <HStack spacing={4}>
        <Box position="relative" flex="1">
          <Box position="absolute" left="12px" top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
            <Search size={16} />
          </Box>
          <Input
            placeholder="搜索归档工单标题、编号或描述..."
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
                  <Th>归档人</Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('updatedAt')}
                    userSelect="none"
                    _hover={{ color: 'brand.600' }}
                  >
                    <HStack spacing={1}>
                      <Text>关闭时间</Text>
                      {renderSortIcon('updatedAt')}
                    </HStack>
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('archivedAt')}
                    userSelect="none"
                    _hover={{ color: 'brand.600' }}
                  >
                    <HStack spacing={1}>
                      <Text>归档时间</Text>
                      {renderSortIcon('archivedAt')}
                    </HStack>
                  </Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pageTickets.length === 0 ? (
                  <Tr>
                    <Td colSpan={11} textAlign="center" py={12}>
                      <VStack spacing={2}>
                        <FileText size={48} color="gray.300" />
                        <Text color="gray.400" fontSize="md">暂无归档工单</Text>
                      </VStack>
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
                      <Td>{getUserName(ticket.archivedBy)}</Td>
                      <Td fontSize="sm" color="gray.500">{formatDateTime(ticket.updatedAt)}</Td>
                      <Td fontSize="sm" color="gray.500">{formatDateTime(ticket.archivedAt!)}</Td>
                      <Td>
                        <HStack spacing={1}>
                          <IconButton
                            aria-label="从归档恢复"
                            icon={<Undo2 size={14} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            onClick={() => handleUnarchiveClick(ticket.id)}
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
        isOpen={isUnarchiveOpen}
        leastDestructiveRef={cancelRef}
        onClose={onUnarchiveClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="16px">
            <AlertDialogHeader fontSize="lg" fontWeight="600">
              确认从归档恢复
            </AlertDialogHeader>
            <AlertDialogBody>
              <VStack align="stretch" spacing={4}>
                <Alert status="info" borderRadius="8px">
                  <AlertIcon />
                  <Text fontSize="sm">
                    工单 <Text as="span" fontWeight="700">{actionTicketId}</Text> 将从归档恢复到工单列表中。
                  </Text>
                </Alert>
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onUnarchiveClose}>
                取消
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<Undo2 size={16} />}
                onClick={handleConfirmUnarchive}
                ml={3}
              >
                确认恢复
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isBatchUnarchiveOpen}
        leastDestructiveRef={cancelRef}
        onClose={onBatchUnarchiveClose}
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
                    即将从归档恢复选中的 <Text as="span" fontWeight="700">{selectedIds.length}</Text> 个工单到工单列表中。
                  </Text>
                </Alert>
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onBatchUnarchiveClose}>
                取消
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<Undo2 size={16} />}
                onClick={handleConfirmBatchUnarchive}
                ml={3}
              >
                确认恢复 ({selectedIds.length})
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal isOpen={isArchiveEligibleOpen} onClose={onArchiveEligibleClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>待归档工单</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Alert status="info" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">
                  以下工单已关闭超过 {ARCHIVE_AFTER_DAYS} 天，可以进行归档以提升列表加载速度。
                </Text>
              </Alert>
              {eligibleForArchive.length === 0 ? (
                <Text textAlign="center" py={8} color="gray.500">暂无待归档的工单</Text>
              ) : (
                <>
                  <Box>
                    <HStack spacing={2} mb={2}>
                      <Checkbox
                        isChecked={allEligibleSelected}
                        isIndeterminate={!allEligibleSelected && eligibleSelectedIds.length > 0}
                        onChange={toggleEligibleSelectAll}
                      >
                        <Text fontSize="sm" fontWeight="600">
                          全选（{eligibleSelectedIds.length}/{eligibleForArchive.length}）
                        </Text>
                      </Checkbox>
                    </HStack>
                  </Box>
                  <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                    {eligibleForArchive.map(ticket => (
                      <Card key={ticket.id} borderRadius="8px" bg="gray.50">
                        <CardBody py={2} px={3}>
                          <HStack>
                            <Checkbox
                              isChecked={eligibleSelectedIds.includes(ticket.id)}
                              onChange={() => toggleEligibleSelect(ticket.id)}
                              mr={2}
                            />
                            <Text fontSize="sm" fontWeight="600" color="brand.600">{ticket.id}</Text>
                            <Text fontSize="sm" isTruncated flex={1}>{ticket.title}</Text>
                            <StatusBadge status={ticket.status} size="sm" />
                            <Text fontSize="xs" color="gray.500">
                              关闭于 {formatDateTime(ticket.updatedAt)}
                            </Text>
                            <IconButton
                              aria-label="立即归档"
                              icon={<Archive size={14} />}
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => handleConfirmManualArchive(ticket.id)}
                            />
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onArchiveEligibleClose}>
              取消
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<Archive size={16} />}
              onClick={handleBatchArchiveEligible}
              isDisabled={eligibleForArchive.length === 0}
            >
              {eligibleSelectedIds.length > 0
                ? `归档选中 (${eligibleSelectedIds.length})`
                : `全部归档 (${eligibleForArchive.length})`
              }
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBatchResultOpen} onClose={onBatchResultClose}>
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>归档结果</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {batchResult && (
              <VStack align="stretch" spacing={4}>
                <HStack spacing={3}>
                  <Badge colorScheme="green" px={3} py={1} borderRadius="8px">
                    成功 {batchResult.success} 条
                  </Badge>
                  {batchResult.failed > 0 && (
                    <Badge colorScheme="red" px={3} py={1} borderRadius="8px">
                      失败 {batchResult.failed} 条
                    </Badge>
                  )}
                </HStack>
                {batchResult.failedItems.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color="red.500" mb={2}>失败详情</Text>
                    <VStack align="stretch" spacing={2} maxH="320px" overflowY="auto">
                      {batchResult.failedItems.map(item => (
                        <Card key={item.id} borderRadius="8px" bg="red.50" border="1px solid" borderColor="red.100">
                          <CardBody py={2} px={3}>
                            <HStack>
                              <Text fontSize="sm" fontWeight="600" color="red.600">{item.id}</Text>
                              <Text fontSize="sm" isTruncated flex={1}>{item.title}</Text>
                            </HStack>
                            <Text fontSize="xs" color="red.500" mt={1}>{item.reason}</Text>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onBatchResultClose}>
              知道了
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}
