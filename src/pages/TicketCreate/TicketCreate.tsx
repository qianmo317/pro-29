import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Select,
  Textarea,
  Button,
  SimpleGrid,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Badge,
  useToast,
} from '@chakra-ui/react'
import { ArrowLeft, Send, BookOpen } from 'lucide-react'
import { useTicketStore } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import { useKnowledgeStore } from '@/store/knowledgeStore'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/types'
import { type TicketCategory, type TicketPriority } from '@/types'

export default function TicketCreate() {
  const navigate = useNavigate()
  const toast = useToast()
  const addTicket = useTicketStore((s) => s.addTicket)
  const users = useUserStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)
  const searchArticles = useKnowledgeStore((s) => s.searchArticles)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('software')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const agents = useMemo(() => users.filter((u) => u.role === 'agent'), [users])

  if (!currentUser) return null

  const recommendedArticles = useMemo(() => {
    if (!title.trim()) return []
    return searchArticles(title).slice(0, 3)
  }, [title, searchArticles])

  const titleError = submitted && !title.trim() ? '请输入工单标题' : ''
  const descriptionError = submitted
    ? !description.trim()
      ? '请输入工单描述'
      : description.trim().length < 10
        ? '描述至少需要10个字符'
        : ''
    : ''

  const handleSubmit = () => {
    setSubmitted(true)
    if (titleError || descriptionError) return

    const newTicket = addTicket({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      creatorId: currentUser.id,
      assigneeId: assigneeId || null,
      knowledgeId: null,
    })

    toast({
      title: '工单创建成功',
      description: `工单 ${newTicket.id} 已成功创建`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    })

    navigate(`/tickets/${newTicket.id}`)
  }

  return (
    <Box>
      <HStack mb={6} spacing={4}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tickets')}
          px={2}
        >
          <ArrowLeft size={18} />
        </Button>
        <Heading size="lg">创建工单</Heading>
      </HStack>

      <SimpleGrid columns={2} spacing={6}>
        <Card>
          <CardBody>
            <VStack spacing={5} align="stretch">
              <FormControl isInvalid={!!titleError}>
                <FormLabel>标题</FormLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入工单标题"
                />
                {titleError && <FormErrorMessage>{titleError}</FormErrorMessage>}
              </FormControl>

              <FormControl isInvalid={!!descriptionError}>
                <FormLabel>描述</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请详细描述问题（至少10个字符）"
                  minH="120px"
                />
                {descriptionError && <FormErrorMessage>{descriptionError}</FormErrorMessage>}
              </FormControl>

              <FormControl>
                <FormLabel>分类</FormLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>优先级</FormLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>指派处理人</FormLabel>
                <Select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="请选择处理人"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </Select>
              </FormControl>

              <HStack spacing={3} pt={2}>
                <Button
                  colorScheme="brand"
                  leftIcon={<Send size={16} />}
                  onClick={handleSubmit}
                >
                  提交工单
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/tickets')}
                >
                  取消
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack spacing={2}>
                <BookOpen size={18} />
                <Heading size="sm">相关知识文章</Heading>
              </HStack>

              {!title.trim() ? (
                <Text color="gray.500" fontSize="sm">
                  输入工单标题获取推荐
                </Text>
              ) : recommendedArticles.length === 0 ? (
                <Text color="gray.500" fontSize="sm">
                  未找到相关文章
                </Text>
              ) : (
                <VStack align="stretch" spacing={3}>
                  {recommendedArticles.map((article) => (
                    <Box
                      key={article.id}
                      p={3}
                      borderRadius="12px"
                      bg="gray.50"
                      cursor="pointer"
                      _hover={{ bg: 'brand.50' }}
                      onClick={() => navigate(`/knowledge/${article.id}`)}
                    >
                      <Text fontWeight="500" mb={2} noOfLines={1}>
                        {article.title}
                      </Text>
                      <HStack spacing={1} flexWrap="wrap">
                        {article.tags.map((tag) => (
                          <Badge key={tag} size="sm" colorScheme="brand" variant="subtle">
                            {tag}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  )
}
