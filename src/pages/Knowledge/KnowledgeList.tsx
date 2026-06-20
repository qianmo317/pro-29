import { useState, useMemo, useRef } from 'react'
import { useKnowledgeStore } from '@/store/knowledgeStore'
import { useUserStore } from '@/store/userStore'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  SimpleGrid,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Badge,
  InputGroup,
  InputLeftElement,
  Icon,
  Tag,
  Button,
  IconButton,
  Tooltip,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react'
import { Search, BookOpen, Tag as TagIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import { CATEGORY_LABELS, type TicketCategory } from '@/types'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

export default function KnowledgeList() {
  const navigate = useNavigate()
  const toast = useToast()
  const articles = useKnowledgeStore((s) => s.articles)
  const searchArticles = useKnowledgeStore((s) => s.searchArticles)
  const getArticlesByCategory = useKnowledgeStore((s) => s.getArticlesByCategory)
  const deleteArticle = useKnowledgeStore((s) => s.deleteArticle)
  const users = useUserStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)
  const isAdmin = currentUser?.role === 'admin'

  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filteredArticles = useMemo(() => {
    let result = activeCategory === 'all'
      ? articles
      : getArticlesByCategory(activeCategory)
    if (search.trim()) {
      result = searchArticles(search.trim())
      if (activeCategory !== 'all') {
        result = result.filter((a) => a.category === activeCategory)
      }
    }
    return result
  }, [search, activeCategory, articles, searchArticles, getArticlesByCategory])

  const getUserName = (id: string) => {
    const user = users.find((u) => u.id === id)
    return user ? user.name : '未知'
  }

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)] as const

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    onOpen()
  }

  const handleConfirmDelete = () => {
    if (!deletingId) return
    const ok = deleteArticle(deletingId)
    if (ok) {
      toast({ status: 'success', title: '删除成功', description: '文章已删除' })
    } else {
      toast({ status: 'error', title: '删除失败', description: '文章不存在' })
    }
    setDeletingId(null)
    onClose()
  }

  const handleEditClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    navigate(`/knowledge/${id}/edit`)
  }

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <HStack spacing={3}>
          <Icon as={BookOpen} boxSize={6} color="brand.500" />
          <Heading size="lg">知识库</Heading>
        </HStack>
        <HStack>
          <InputGroup maxW="360px">
            <InputLeftElement pointerEvents="none">
              <Icon as={Search} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="搜索文章..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              borderRadius="12px"
            />
          </InputGroup>
          {isAdmin && (
            <Button
              colorScheme="brand"
              leftIcon={<Icon as={Plus} />}
              onClick={() => navigate('/knowledge/create')}
            >
              发布新文章
            </Button>
          )}
        </HStack>
      </HStack>

      <HStack spacing={2} mb={6} flexWrap="wrap">
        {categories.map((cat) => {
          const isActive = activeCategory === cat
          const label = cat === 'all' ? '全部' : CATEGORY_LABELS[cat as TicketCategory]
          return (
            <Tag
              key={cat}
              size="md"
              variant={isActive ? 'solid' : 'subtle'}
              colorScheme={isActive ? 'brand' : 'gray'}
              cursor="pointer"
              onClick={() => setActiveCategory(cat)}
              _hover={{ opacity: 0.8 }}
            >
              {label}
            </Tag>
          )
        })}
      </HStack>

      {filteredArticles.length === 0 ? (
        <VStack py={16}>
          <Icon as={BookOpen} boxSize={12} color="gray.300" />
          <Text color="gray.400" fontSize="lg">暂无相关文章</Text>
        </VStack>
      ) : (
        <SimpleGrid columns={2} spacing={5}>
          {filteredArticles.map((article) => (
            <Card
              key={article.id}
              cursor="pointer"
              _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
              transition="all 0.2s ease"
              onClick={() => navigate(`/knowledge/${article.id}`)}
            >
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between" align="start">
                    <Heading size="md" noOfLines={1} flex={1} pr={2}>
                      {article.title}
                    </Heading>
                    {isAdmin && (
                      <HStack spacing={1} onClick={(e) => e.stopPropagation()}>
                        <Tooltip label="编辑">
                          <IconButton
                            aria-label="edit"
                            size="sm"
                            variant="ghost"
                            colorScheme="brand"
                            icon={<Icon as={Pencil} boxSize={4} />}
                            onClick={(e) => handleEditClick(e, article.id)}
                          />
                        </Tooltip>
                        <Tooltip label="删除">
                          <IconButton
                            aria-label="delete"
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            icon={<Icon as={Trash2} boxSize={4} />}
                            onClick={(e) => handleDeleteClick(e, article.id)}
                          />
                        </Tooltip>
                      </HStack>
                    )}
                  </HStack>

                  <Text color="gray.500" fontSize="sm" noOfLines={2}>
                    {article.content.length > 100
                      ? article.content.slice(0, 100) + '...'
                      : article.content}
                  </Text>

                  <HStack spacing={1} flexWrap="wrap">
                    <Icon as={TagIcon} boxSize={3} color="gray.400" />
                    {article.tags.map((tag) => (
                      <Badge key={tag} colorScheme="brand" variant="subtle" fontSize="xs">
                        {tag}
                      </Badge>
                    ))}
                  </HStack>

                  <HStack justify="space-between" align="center">
                    <HStack spacing={2}>
                      <Badge colorScheme="brand" variant="outline">
                        {CATEGORY_LABELS[article.category]}
                      </Badge>
                      <Text fontSize="xs" color="gray.400">
                        {getUserName(article.authorId)}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.400">
                      {formatTimeAgo(article.updatedAt)}
                    </Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              确认删除文章
            </AlertDialogHeader>
            <AlertDialogBody>
              删除后无法恢复，确定要删除这篇知识文章吗？
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                取消
              </Button>
              <Button colorScheme="red" onClick={handleConfirmDelete} ml={3}>
                确认删除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}
