import { useState } from 'react'
import {
  Box,
  HStack,
  VStack,
  Input,
  Button,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  useToast,
} from '@chakra-ui/react'
import { Plus, X, Check, Search } from 'lucide-react'
import { useTagStore } from '@/store/tagStore'

interface TagSelectProps {
  value: string[]
  onChange: (ids: string[]) => void
}

export default function TagSelect({ value, onChange }: TagSelectProps) {
  const tags = useTagStore((s) => s.tags)
  const getTagById = useTagStore((s) => s.getTagById)
  const getTagByName = useTagStore((s) => s.getTagByName)
  const addTag = useTagStore((s) => s.addTag)
  const toast = useToast()
  const [search, setSearch] = useState('')

  const selectedTags = value.map(getTagById).filter((t): t is NonNullable<typeof t> => !!t)
  const trimmed = search.trim()
  const exactMatch = trimmed ? !!getTagByName(trimmed) : true
  const filtered = trimmed
    ? tags.filter(t => t.name.toLowerCase().includes(trimmed.toLowerCase()))
    : tags

  const toggleTag = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const removeTag = (id: string) => {
    onChange(value.filter(v => v !== id))
  }

  const handleCreate = () => {
    if (!trimmed) return
    if (getTagByName(trimmed)) {
      toast({ title: '该标签已存在', status: 'warning', duration: 1500 })
      return
    }
    const tag = addTag(trimmed)
    onChange([...value, tag.id])
    setSearch('')
  }

  return (
    <VStack align="stretch" spacing={2}>
      {selectedTags.length > 0 && (
        <HStack spacing={2} flexWrap="wrap">
          {selectedTags.map(tag => (
            <Box
              key={tag.id}
              bg={`${tag.color}1A`}
              color={tag.color}
              borderRadius="6px"
              px={2}
              py="2px"
              fontSize="xs"
              fontWeight="500"
              cursor="pointer"
              onClick={() => removeTag(tag.id)}
              _hover={{ opacity: 0.8 }}
            >
              <HStack spacing={1}>
                <Text>{tag.name}</Text>
                <X size={11} />
              </HStack>
            </Box>
          ))}
        </HStack>
      )}

      <Popover placement="bottom-start" trigger="click">
        <PopoverTrigger>
          <Button
            variant="outline"
            size="sm"
            w="fit-content"
            leftIcon={<Plus size={14} />}
            fontWeight="normal"
            color="gray.600"
          >
            {value.length > 0 ? '管理标签' : '添加标签'}
          </Button>
        </PopoverTrigger>
        <PopoverContent w="280px">
          <PopoverArrow />
          <PopoverBody p={3}>
            <VStack align="stretch" spacing={2}>
              <Box position="relative">
                <Box position="absolute" left="10px" top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                  <Search size={13} />
                </Box>
                <Input
                  placeholder="搜索或输入新标签名称"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  size="sm"
                  borderRadius="8px"
                  pl="30px"
                />
              </Box>

              {trimmed && !exactMatch && (
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="brand"
                  justifyContent="flex-start"
                  leftIcon={<Plus size={13} />}
                  onClick={handleCreate}
                >
                  创建新标签「{trimmed}」
                </Button>
              )}

              <Box maxH="220px" overflowY="auto">
                {filtered.length === 0 ? (
                  <Text fontSize="xs" color="gray.400" textAlign="center" py={4}>
                    {trimmed ? '无匹配标签' : '暂无标签，请在上方输入名称创建'}
                  </Text>
                ) : (
                  <VStack align="stretch" spacing={1}>
                    {filtered.map(tag => {
                      const selected = value.includes(tag.id)
                      return (
                        <HStack
                          key={tag.id}
                          p={2}
                          borderRadius="8px"
                          cursor="pointer"
                          bg={selected ? 'brand.50' : 'transparent'}
                          _hover={{ bg: selected ? 'brand.50' : 'gray.50' }}
                          onClick={() => toggleTag(tag.id)}
                          spacing={2}
                        >
                          <Box w="10px" h="10px" borderRadius="50%" bg={tag.color} flexShrink={0} />
                          <Text fontSize="sm" flex={1}>{tag.name}</Text>
                          {selected && <Check size={14} color="#6C5CE7" />}
                        </HStack>
                      )
                    })}
                  </VStack>
                )}
              </Box>
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </VStack>
  )
}
