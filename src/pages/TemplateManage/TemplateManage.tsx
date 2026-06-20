import { useState, useMemo } from 'react'
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
} from '@chakra-ui/react'
import { Plus, Edit2, Trash2, Power, FileText } from 'lucide-react'
import { useTemplateStore } from '@/store/templateStore'
import { useUserStore } from '@/store/userStore'
import { CATEGORY_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types'
import type { TicketTemplate, TicketCategory, TicketPriority } from '@/types'
import { Navigate } from 'react-router-dom'

interface TemplateFormData {
  name: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  title: string
  descriptionContent: string
}

const initialFormData: TemplateFormData = {
  name: '',
  description: '',
  category: 'software',
  priority: 'medium',
  title: '',
  descriptionContent: '',
}

export default function TemplateManage() {
  const currentUser = useUserStore((s) => s.currentUser)
  const templates = useTemplateStore((s) => s.templates)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const updateTemplate = useTemplateStore((s) => s.updateTemplate)
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate)
  const toggleActive = useTemplateStore((s) => s.toggleActive)
  const toast = useToast()

  const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure()

  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<TicketTemplate | null>(null)
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData)
  const [submitted, setSubmitted] = useState(false)

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [templates])

  if (!currentUser) return null

  if (currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setFormData(initialFormData)
    setSubmitted(false)
    openModal()
  }

  const handleOpenEdit = (template: TicketTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      priority: template.priority,
      title: template.title,
      descriptionContent: template.descriptionContent,
    })
    setSubmitted(false)
    openModal()
  }

  const handleOpenDelete = (template: TicketTemplate) => {
    setDeletingTemplate(template)
    openDelete()
  }

  const validateForm = () => {
    const errors: Partial<Record<keyof TemplateFormData, string>> = {}
    if (!formData.name.trim()) errors.name = '请输入模板名称'
    if (!formData.description.trim()) errors.description = '请输入模板描述'
    if (!formData.title.trim()) errors.title = '请输入工单标题模板'
    if (!formData.descriptionContent.trim()) errors.descriptionContent = '请输入工单描述模板'
    return errors
  }

  const errors = validateForm()

  const handleSubmit = () => {
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return

    try {
      if (editingTemplate) {
        updateTemplate(editingTemplate.id, formData)
        toast({
          title: '模板更新成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      } else {
        addTemplate({
          ...formData,
          creatorId: currentUser.id,
        })
        toast({
          title: '模板创建成功',
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
    if (deletingTemplate) {
      deleteTemplate(deletingTemplate.id)
      toast({
        title: '模板已删除',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    }
    closeDelete()
  }

  const handleToggleActive = (template: TicketTemplate) => {
    toggleActive(template.id)
    toast({
      title: template.isActive ? '模板已停用' : '模板已启用',
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }

  const getFieldError = (field: keyof TemplateFormData) => {
    return submitted ? errors[field] || '' : ''
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <HStack spacing={4}>
          <FileText size={24} color="#6C5CE7" />
          <Heading size="lg">工单模板管理</Heading>
        </HStack>
        <Button
          colorScheme="brand"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          新建模板
        </Button>
      </HStack>

      <Text color="gray.500" mb={6} fontSize="sm">
        管理预设工单模板，普通用户创建工单时可直接选用，提高工单创建效率和规范性
      </Text>

      <Card>
        <CardBody p={0}>
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>模板名称</Th>
                <Th>分类</Th>
                <Th>优先级</Th>
                <Th>状态</Th>
                <Th>创建时间</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedTemplates.map((template) => (
                <Tr key={template.id} _hover={{ bg: 'gray.50' }}>
                  <Td>
                    <VStack align="flex-start" spacing={1}>
                      <Text fontWeight="500">{template.name}</Text>
                      <Text fontSize="xs" color="gray.500">{template.description}</Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Badge colorScheme="brand" variant="subtle">
                      {CATEGORY_LABELS[template.category]}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      color="white"
                      bg={PRIORITY_COLORS[template.priority]}
                      variant="solid"
                    >
                      {PRIORITY_LABELS[template.priority]}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={template.isActive ? 'green' : 'gray'}
                      variant="subtle"
                    >
                      {template.isActive ? '启用中' : '已停用'}
                    </Badge>
                  </Td>
                  <Td fontSize="sm" color="gray.500">
                    {new Date(template.createdAt).toLocaleString('zh-CN')}
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label={template.isActive ? '停用' : '启用'}>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          color={template.isActive ? 'green.500' : 'gray.400'}
                          icon={<Power size={16} />}
                          onClick={() => handleToggleActive(template)}
                          aria-label={template.isActive ? '停用' : '启用'}
                        />
                      </Tooltip>
                      <Tooltip label="编辑">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          color="blue.500"
                          icon={<Edit2 size={16} />}
                          onClick={() => handleOpenEdit(template)}
                          aria-label="编辑"
                        />
                      </Tooltip>
                      <Tooltip label="删除">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          color="red.500"
                          icon={<Trash2 size={16} />}
                          onClick={() => handleOpenDelete(template)}
                          aria-label="删除"
                        />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
              {sortedTemplates.length === 0 && (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    <VStack spacing={2}>
                      <FileText size={40} color="gray.300" />
                      <Text color="gray.400">暂无模板，点击上方按钮创建</Text>
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
            {editingTemplate ? '编辑模板' : '新建模板'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!getFieldError('name')}>
                <FormLabel>模板名称</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：新员工入职权限申请"
                />
                {getFieldError('name') && (
                  <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('name')}</Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!getFieldError('description')}>
                <FormLabel>模板描述</FormLabel>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述模板用途，例如：新员工入职时统一使用的权限申请模板"
                />
                {getFieldError('description') && (
                  <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('description')}</Text>
                )}
              </FormControl>

              <HStack spacing={4}>
                <FormControl flex={1}>
                  <FormLabel>默认分类</FormLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TicketCategory })}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl flex={1}>
                  <FormLabel>默认优先级</FormLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <FormControl isInvalid={!!getFieldError('title')}>
                <FormLabel>工单标题模板</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：新员工【姓名】入职权限申请"
                />
                {getFieldError('title') && (
                  <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('title')}</Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!getFieldError('descriptionContent')}>
                <FormLabel>工单描述模板</FormLabel>
                <Textarea
                  value={formData.descriptionContent}
                  onChange={(e) => setFormData({ ...formData, descriptionContent: e.target.value })}
                  placeholder="填写工单描述的模板内容，可以使用【】标记需要用户替换的内容"
                  minH="200px"
                  fontFamily="monospace"
                  fontSize="sm"
                />
                {getFieldError('descriptionContent') && (
                  <Text color="red.500" fontSize="xs" mt={1}>{getFieldError('descriptionContent')}</Text>
                )}
                <Text fontSize="xs" color="gray.500" mt={2}>
                  提示：使用【】标记需要用户替换的内容，例如【员工姓名】、【部门】等
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={closeModal} mr={3}>
              取消
            </Button>
            <Button colorScheme="brand" onClick={handleSubmit}>
              {editingTemplate ? '保存修改' : '创建模板'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={undefined}
        onClose={closeDelete}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              删除模板
            </AlertDialogHeader>

            <AlertDialogBody>
              确定要删除模板 <Text as="span" fontWeight="500">"{deletingTemplate?.name}"</Text> 吗？
              此操作不可撤销。
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button variant="ghost" onClick={closeDelete}>
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
