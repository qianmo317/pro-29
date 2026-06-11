import { useState, useMemo } from 'react'
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
} from '@chakra-ui/react'
import { Search, BookOpen, Tag as TagIcon } from 'lucide-react'
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
  const articles = useKnowledgeStore((s) => s.articles)
  const searchArticles = useKnowledgeStore((s) => s.searchArticles)
  const getArticlesByCategory = useKnowledgeStore((s) => s.getArticlesByCategory)
  const users = useUserStore((s) => s.users)

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

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <HStack spacing={3}>
          <Icon as={BookOpen} boxSize={6} color="brand.500" />
          <Heading size="lg">知识库</Heading>
        </HStack>
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
                  <Heading size="md" noOfLines={1}>
                    {article.title}
                  </Heading>

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
    </Box>
  )
}
