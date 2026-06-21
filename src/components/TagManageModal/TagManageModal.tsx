import { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Input,
  Text,
  Box,
  Card,
  CardBody,
  IconButton,
  useToast,
} from '@chakra-ui/react'
import { Plus, Check, X, Pencil, Trash2 } from 'lucide-react'
import { useTagStore } from '@/store/tagStore'
import { TAG_COLORS } from '@/types'

interface TagManageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TagManageModal({ isOpen, onClose }: TagManageModalProps) {
  const tags = useTagStore((s) => s.tags)
  const addTag = useTagStore((s) => s.addTag)
  const updateTag = useTagStore((s) => s.updateTag)
  const deleteTag = useTagStore((s) => s.deleteTag)
  const getTagByName = useTagStore((s) => s.getTagByName)
  const toast = useToast()

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(TAG_COLORS[0])

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const resetAdd = () => {
    setNewName('')
    setNewColor(TAG_COLORS[0])
  }

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      toast({ title: '请输入标签名称', status: 'warning', duration: 1500 })
      return
    }
    if (getTagByName(trimmed)) {
      toast({ title: '该标签名称已存在', status: 'warning', duration: 1500 })
      return
    }
    addTag(trimmed, newColor)
    toast({ title: '标签已创建', status: 'success', duration: 1500 })
    resetAdd()
  }

  const startEdit = (id: string, name: string, color: string) => {
    setEditId(id)
    setEditName(name)
    setEditColor(color)
    setDeleteId(null)
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName('')
  }

  const handleSaveEdit = () => {
    if (!editId) return
    const trimmed = editName.trim()
    if (!trimmed) {
      toast({ title: '请输入标签名称', status: 'warning', duration: 1500 })
      return
    }
    const existing = getTagByName(trimmed)
    if (existing && existing.id !== editId) {
      toast({ title: '该标签名称已存在', status: 'warning', duration: 1500 })
      return
    }
    updateTag(editId, trimmed, editColor)
    toast({ title: '标签已更新', status: 'success', duration: 1500 })
    cancelEdit()
  }

  const handleConfirmDelete = () => {
    if (!deleteId) return
    deleteTag(deleteId)
    toast({ title: '标签已删除', status: 'success', duration: 1500 })
    setDeleteId(null)
  }

  const handleClose = () => {
    cancelEdit()
    setDeleteId(null)
    resetAdd()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent borderRadius="16px">
        <ModalHeader>标签管理</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Card borderRadius="12px" bg="brand.50" border="1px solid" borderColor="brand.100">
              <CardBody p={4}>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="sm" fontWeight="600" color="gray.700">新建标签</Text>
                  <Input
                    placeholder="输入标签名称"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    borderRadius="8px"
                    bg="white"
                  />
                  <ColorPicker value={newColor} onChange={setNewColor} />
                  <Button
                    colorScheme="brand"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={handleAdd}
                    w="fit-content"
                  >
                    添加标签
                  </Button>
                </VStack>
              </CardBody>
            </Card>

            <Box>
              <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                已有标签（{tags.length}）
              </Text>
              <VStack align="stretch" spacing={2} maxH="320px" overflowY="auto">
                {tags.length === 0 ? (
                  <Text fontSize="sm" color="gray.400" textAlign="center" py={6}>
                    暂无标签，请在上方创建
                  </Text>
                ) : (
                  tags.map(tag => {
                    if (deleteId === tag.id) {
                      return (
                        <HStack
                          key={tag.id}
                          p={3}
                          borderRadius="8px"
                          bg="red.50"
                          border="1px solid"
                          borderColor="red.200"
                          spacing={3}
                        >
                          <Text fontSize="sm" color="red.600" flex={1}>
                            删除后将从所有工单中移除该标签，确认删除？
                          </Text>
                          <Button size="xs" colorScheme="red" onClick={handleConfirmDelete}>
                            确认
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setDeleteId(null)}>
                            取消
                          </Button>
                        </HStack>
                      )
                    }
                    if (editId === tag.id) {
                      return (
                        <VStack
                          key={tag.id}
                          align="stretch"
                          p={3}
                          borderRadius="8px"
                          bg="gray.50"
                          border="1px solid"
                          borderColor="brand.200"
                          spacing={3}
                        >
                          <Input
                            placeholder="标签名称"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            borderRadius="8px"
                            bg="white"
                            size="sm"
                          />
                          <ColorPicker value={editColor} onChange={setEditColor} />
                          <HStack spacing={2}>
                            <Button size="xs" colorScheme="brand" leftIcon={<Check size={13} />} onClick={handleSaveEdit}>
                              保存
                            </Button>
                            <Button size="xs" variant="ghost" leftIcon={<X size={13} />} onClick={cancelEdit}>
                              取消
                            </Button>
                          </HStack>
                        </VStack>
                      )
                    }
                    return (
                      <HStack
                        key={tag.id}
                        p={3}
                        borderRadius="8px"
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        spacing={3}
                      >
                        <Box w="14px" h="14px" borderRadius="50%" bg={tag.color} flexShrink={0} />
                        <Text fontSize="sm" fontWeight="500" flex={1}>{tag.name}</Text>
                        <IconButton
                          aria-label="编辑标签"
                          icon={<Pencil size={14} />}
                          size="xs"
                          variant="ghost"
                          onClick={() => startEdit(tag.id, tag.name, tag.color)}
                        />
                        <IconButton
                          aria-label="删除标签"
                          icon={<Trash2 size={14} />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => setDeleteId(tag.id)}
                        />
                      </HStack>
                    )
                  })
                )}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>关闭</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <HStack spacing={2}>
      {TAG_COLORS.map(color => (
        <Box
          key={color}
          w="22px"
          h="22px"
          borderRadius="50%"
          bg={color}
          cursor="pointer"
          border={value === color ? '2px solid' : '2px solid transparent'}
          borderColor={value === color ? 'gray.800' : 'transparent'}
          boxShadow={value === color ? '0 0 0 2px white' : 'none'}
          onClick={() => onChange(color)}
          transition="all 0.15s"
          _hover={{ transform: 'scale(1.1)' }}
        />
      ))}
    </HStack>
  )
}
