import { useState, useMemo, useRef } from 'react'
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  IconButton,
  Tooltip,
  Switch,
  FormHelperText,
} from '@chakra-ui/react'
import { Plus, Edit2, Trash2, Power, Megaphone, Calendar } from 'lucide-react'
import { useAnnouncementStore } from '@/store/announcementStore'
import { useUserStore } from '@/store/userStore'
import {
  ANNOUNCEMENT_LEVEL_LABELS,
  ANNOUNCEMENT_LEVEL_COLORS,
} from '@/types'
import type { Announcement, AnnouncementLevel } from '@/types'
import { Navigate } from 'react-router-dom'

interface AnnouncementFormData {
  title: string
  content: string
  level: AnnouncementLevel
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

function getDefaultFormData(): AnnouncementFormData {
  const now = new Date()
  const from = new Date(now.getTime() - 60 * 1000)
  const to = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
  return {
    title: '',
    content: '',
    level: 'info',
    effectiveFrom: from.toISOString().slice(0, 16),
    effectiveTo: to.toISOString().slice(0, 16),
    isActive: true,
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function isAnnouncementActive(announcement: Announcement): boolean {
  if (!announcement.isActive) return false
  const now = new Date()
  const from = new Date(announcement.effectiveFrom)
  const to = new Date(announcement.effectiveTo)
  return now >= from && now <= to
}

export default function AnnouncementManage() {
  const currentUser = useUserStore((s) => s.currentUser)
  const users = useUserStore((s) => s.users)
  const getAllAnnouncements = useAnnouncementStore((s) => s.getAllAnnouncements)
  const createAnnouncement = useAnnouncementStore((s) => s.createAnnouncement)
  const updateAnnouncement = useAnnouncementStore((s) => s.updateAnnouncement)
  const deleteAnnouncement = useAnnouncementStore((s) => s.deleteAnnouncement)
  const toast = useToast()

  const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure()

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState<AnnouncementFormData>(getDefaultFormData())
  const [submitted, setSubmitted] = useState(false)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)

  const announcements = getAllAnnouncements()

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [announcements])

  if (!currentUser) return null

  if (currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const handleOpenCreate = () => {
    setEditingAnnouncement(null)
    setFormData(getDefaultFormData())
    setSubmitted(false)
    openModal()
  }

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      level: announcement.level,
      effectiveFrom: announcement.effectiveFrom.slice(0, 16),
      effectiveTo: announcement.effectiveTo.slice(0, 16),
      isActive: announcement.isActive,
    })
    setSubmitted(false)
    openModal()
  }

  const handleOpenDelete = (announcement: Announcement) => {
    setDeletingAnnouncement(announcement)
    openDelete()
  }

  const validateForm = () => {
    const errors: Partial<Record<keyof AnnouncementFormData, string>> = {}
    if (!formData.title.trim()) errors.title = '请输入公告标题'
    if (!formData.content.trim()) errors.content = '请输入公告内容'
    if (!formData.effectiveFrom) errors.effectiveFrom = '请选择生效时间'
    if (!formData.effectiveTo) errors.effectiveTo = '请选择失效时间'
    if (formData.effectiveFrom && formData.effectiveTo) {
      if (new Date(formData.effectiveFrom) >= new Date(formData.effectiveTo)) {
        errors.effectiveTo = '失效时间必须晚于生效时间'
      }
    }
    return errors
  }

  const errors = validateForm()

  const handleSubmit = () => {
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return

    try {
      const data = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        level: formData.level,
        effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        effectiveTo: new Date(formData.effectiveTo).toISOString(),
        isActive: formData.isActive,
      }

      if (editingAnnouncement) {
        updateAnnouncement(editingAnnouncement.id, data)
        toast({
          title: '公告更新成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      } else {
        createAnnouncement({
          ...data,
          creatorId: currentUser.id,
        })
        toast({
          title: '公告发布成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      }
      closeModal()
    } catch (e) {
      toast({
        title: '操作失败',
        description: e instanceof Error ? e.message : '未知错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleDelete = () => {
    if (deletingAnnouncement) {
      deleteAnnouncement(deletingAnnouncement.id)
      toast({
        title: '公告已删除',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    }
    closeDelete()
  }

  const handleToggleActive = (announcement: Announcement) => {
    updateAnnouncement(announcement.id, { isActive: !announcement.isActive })
    toast({
      title: announcement.isActive ? '公告已停用' : '公告已启用',
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }

  const getFieldError = (field: keyof AnnouncementFormData) => {
    return submitted ? errors[field] || '' : ''
  }

  const getCreatorName = (creatorId: string): string => {
    const user = users.find((u) => u.id === creatorId)
    return user ? user.name : '未知用户'
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <HStack spacing={4}>
          <Megaphone size={24} color="#6C5CE7" />
          <Heading size="lg">公告管理</Heading>
        </HStack>
        <Button
          colorScheme="brand"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          发布公告
        </Button>
      </HStack>

      <Text color="gray.500" mb={6} fontSize="sm">
        发布系统公告通知，所有登录用户都能在首页看到。公告支持设置有效期和重要级别。
      </Text>

      <Card>
        <CardBody p={0}>
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>公告标题</Th>
                <Th>级别</Th>
                <Th>状态</Th>
                <Th>有效期</Th>
                <Th>创建人</Th>
                <Th>创建时间</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedAnnouncements.map((announcement) => {
                const isActive = isAnnouncementActive(announcement)
                return (
                  <Tr key={announcement.id} _hover={{ bg: 'gray.50' }}>
                    <Td>
                      <VStack align="flex-start" spacing={1}>
                        <Text fontWeight="500" noOfLines={1} maxW="300px">
                          {announcement.title}
                        </Text>
                        <Text fontSize="xs" color="gray.500" noOfLines={1} maxW="300px">
                          {announcement.content}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Badge
                      color="white"
                      bg={ANNOUNCEMENT_LEVEL_COLORS[announcement.level]}
                      variant="solid"
                    >
                      {ANNOUNCEMENT_LEVEL_LABELS[announcement.level]}
                    </Badge>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={isActive ? 'green' : announcement.isActive ? 'yellow' : 'gray'}
                        variant="subtle"
                      >
                        {isActive ? '展示中' : announcement.isActive ? '未到时间' : '已停用'}
                      </Badge>
                    </Td>
                    <Td>
                      <VStack align="flex-start" spacing={0}>
                      <Text fontSize="xs" color="gray.600">
                        <Calendar size={12} /> {formatDateTime(announcement.effectiveFrom)}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        至 {formatDateTime(announcement.effectiveTo)}
                      </Text>
                    </VStack>
                    </Td>
                    <Td fontSize="sm" color="gray.600">
                      {getCreatorName(announcement.creatorId)}
                    </Td>
                    <Td fontSize="sm" color="gray.500">
                      {formatDateTime(announcement.createdAt)}
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label={announcement.isActive ? '停用' : '启用'}>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            color={announcement.isActive ? 'green.500' : 'gray.400'}
                            icon={<Power size={16} />}
                            onClick={() => handleToggleActive(announcement)}
                            aria-label={announcement.isActive ? '停用' : '启用'}
                          />
                        </Tooltip>
                        <Tooltip label="编辑">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            color="blue.500"
                            icon={<Edit2 size={16} />}
                            onClick={() => handleOpenEdit(announcement)}
                            aria-label="编辑"
                          />
                        </Tooltip>
                        <Tooltip label="删除">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            color="red.500"
                            icon={<Trash2 size={16} />}
                            onClick={() => handleOpenDelete(announcement)}
                            aria-label="删除"
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                )
              })}
              {sortedAnnouncements.length === 0 && (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <VStack spacing={2}>
                      <Megaphone size={40} color="gray.300" />
                      <Text color="gray.400">暂无公告，点击上方按钮发布</Text>
                    </VStack>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingAnnouncement ? '编辑公告' : '发布公告'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!getFieldError('title')}>
                <FormLabel>公告标题</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：系统维护通知"
                />
                {getFieldError('title') && (
                  <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('title')}</Text>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>重要级别</FormLabel>
                <Select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as AnnouncementLevel })}
                >
                  {Object.entries(ANNOUNCEMENT_LEVEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
                <FormHelperText>
                  不同级别会以不同颜色展示，级别越高越醒目
                </FormHelperText>
              </FormControl>

              <FormControl isInvalid={!!getFieldError('content')}>
                <FormLabel>公告内容</FormLabel>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="请输入公告的详细内容..."
                  minH="120px"
                />
                {getFieldError('content') && (
                  <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('content')}</Text>
                )}
              </FormControl>

              <HStack spacing={4}>
                <FormControl flex={1} isInvalid={!!getFieldError('effectiveFrom')}>
                  <FormLabel>生效时间</FormLabel>
                  <Input
                    type="datetime-local"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  />
                  {getFieldError('effectiveFrom') && (
                    <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('effectiveFrom')}</Text>
                  )}
                </FormControl>
                <FormControl flex={1} isInvalid={!!getFieldError('effectiveTo')}>
                  <FormLabel>失效时间</FormLabel>
                  <Input
                    type="datetime-local"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                  />
                  {getFieldError('effectiveTo') && (
                    <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('effectiveTo')}</Text>
                  )}
                </FormControl>
              </HStack>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel mb={0}>立即启用</FormLabel>
                  <Switch
                    isChecked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    colorScheme="brand"
                  />
                </HStack>
                <FormHelperText>
                  关闭后公告不会显示给用户，可稍后手动启用
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={closeModal} mr={3}>
              取消
            </Button>
            <Button colorScheme="brand" onClick={handleSubmit}>
              {editingAnnouncement ? '保存修改' : '发布公告'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={closeDelete}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              删除公告
            </AlertDialogHeader>

            <AlertDialogBody>
              确定要删除公告 <Text as="span" fontWeight="500">"{deletingAnnouncement?.title}"</Text> 吗？
              此操作不可撤销。
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} variant="ghost" onClick={closeDelete}>
                取消
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                确认删除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}
