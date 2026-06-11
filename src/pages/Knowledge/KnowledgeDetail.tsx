import { useKnowledgeStore } from '@/store/knowledgeStore'
import { useUserStore } from '@/store/userStore'
import { useNavigate, useParams } from 'react-router-dom'
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
  Divider,
  Icon,
} from '@chakra-ui/react'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'
import { CATEGORY_LABELS } from '@/types'
import { useTicketStore } from '@/store/ticketStore'

export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getArticleById = useKnowledgeStore((s) => s.getArticleById)
  const users = useUserStore((s) => s.users)
  const getTicketById = useTicketStore((s) => s.getTicketById)

  const article = id ? getArticleById(id) : undefined

  if (!article) {
    return (
      <VStack py={16}>
        <Icon as={BookOpen} boxSize={12} color="gray.300" />
        <Text color="gray.400" fontSize="lg">文章未找到</Text>
        <Button
          leftIcon={<Icon as={ArrowLeft} />}
          variant="outline"
          colorScheme="brand"
          onClick={() => navigate('/knowledge')}
        >
          返回知识库
        </Button>
      </VStack>
    )
  }

  const author = users.find((u) => u.id === article.authorId)
  const relatedTicket = article.relatedTicketId
    ? getTicketById(article.relatedTicketId)
    : undefined

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <Box p={6}>
      <HStack mb={6}>
        <Button
          leftIcon={<Icon as={ArrowLeft} />}
          variant="ghost"
          colorScheme="brand"
          onClick={() => navigate('/knowledge')}
        >
          知识库
        </Button>
      </HStack>

      <Card>
        <CardBody>
          <VStack align="stretch" spacing={5}>
            <Heading size="lg">{article.title}</Heading>

            <HStack spacing={3} flexWrap="wrap" align="center">
              <Badge colorScheme="brand" variant="solid">
                {CATEGORY_LABELS[article.category]}
              </Badge>
              {article.tags.map((tag) => (
                <Badge key={tag} colorScheme="brand" variant="subtle">
                  {tag}
                </Badge>
              ))}
              <Text fontSize="sm" color="gray.500">
                {author?.name ?? '未知'}
              </Text>
              <Text fontSize="sm" color="gray.400">
                创建于 {formatDate(article.createdAt)}
              </Text>
              {article.updatedAt !== article.createdAt && (
                <Text fontSize="sm" color="gray.400">
                  更新于 {formatDate(article.updatedAt)}
                </Text>
              )}
            </HStack>

            <Divider />

            <Text whiteSpace="pre-wrap" lineHeight="tall">
              {article.content}
            </Text>
          </VStack>
        </CardBody>
      </Card>

      {relatedTicket && (
        <Box mt={5}>
          <Heading size="sm" mb={3}>
            关联工单
          </Heading>
          <Card
            cursor="pointer"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s ease"
            onClick={() => navigate(`/tickets/${relatedTicket.id}`)}
          >
            <CardBody>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <HStack>
                    <Text fontWeight="600" color="brand.500">
                      {relatedTicket.id}
                    </Text>
                    <Text fontWeight="500">{relatedTicket.title}</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Badge colorScheme="brand" variant="outline">
                      {CATEGORY_LABELS[relatedTicket.category]}
                    </Badge>
                    <Text fontSize="sm" color="gray.400">
                      {formatDate(relatedTicket.createdAt)}
                    </Text>
                  </HStack>
                </VStack>
                <Icon as={ExternalLink} boxSize={5} color="gray.400" />
              </HStack>
            </CardBody>
          </Card>
        </Box>
      )}
    </Box>
  )
}
