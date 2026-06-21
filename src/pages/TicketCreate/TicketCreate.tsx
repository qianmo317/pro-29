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
  RadioGroup,
  Radio,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  Stack,
} from '@chakra-ui/react'
import { ArrowLeft, Send, BookOpen, FileText, ChevronDown, CalendarClock } from 'lucide-react'
import TagSelect from '@/components/TagSelect/TagSelect'
import { useTicketStore } from '@/store/ticketStore'
import { useScheduledTicketStore } from '@/store/scheduledTicketStore'
import { useUserStore } from '@/store/userStore'
import { useDepartmentStore } from '@/store/departmentStore'
import { useKnowledgeStore } from '@/store/knowledgeStore'
import { useTemplateStore } from '@/store/templateStore'
import { CATEGORY_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types'
import { type TicketCategory, type TicketPriority, type TicketTemplate } from '@/types'

export default function TicketCreate() {
  const navigate = useNavigate()
  const toast = useToast()
  const addTicket = useTicketStore((s) => s.addTicket)
  const addScheduledTicket = useScheduledTicketStore((s) => s.addScheduledTicket)
  const users = useUserStore((s) => s.users)
  const getAgentsByDepartment = useUserStore((s) => s.getAgentsByDepartment)
  const departments = useDepartmentStore((s) => s.departments)
  const currentUser = useUserStore((s) => s.currentUser)
  const searchArticles = useKnowledgeStore((s) => s.searchArticles)
  const templates = useTemplateStore((s) => s.templates)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('software')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [departmentId, setDepartmentId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplate | null>(null)
  const [createMode, setCreateMode] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledTime, setScheduledTime] = useState('')

  const agents = useMemo(() => {
    if (departmentId) {
      return getAgentsByDepartment(departmentId)
    }
    return users.filter((u) => u.role === 'agent')
  }, [users, departmentId, getAgentsByDepartment])

  const handleDepartmentChange = (deptId: string) => {
    setDepartmentId(deptId)
    if (deptId && assigneeId) {
      const deptAgentIds = getAgentsByDepartment(deptId).map(u => u.id)
      if (!deptAgentIds.includes(assigneeId)) {
        setAssigneeId('')
      }
    }
  }

  const activeTemplates = useMemo(() => templates.filter((t) => t.isActive), [templates])
  const recommendedArticles = useMemo(() => {
    if (!title.trim()) return []
    return searchArticles(title).slice(0, 3)
  }, [title, searchArticles])

  const handleSelectTemplate = (template: TicketTemplate) => {
    setSelectedTemplate(template)
    setTitle(template.title)
    setDescription(template.descriptionContent)
    setCategory(template.category)
    setPriority(template.priority)
    toast({
      title: '模板已应用',
      description: `已应用模板「${template.name}」，请根据实际情况调整内容`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }

  const handleClearTemplate = () => {
    setSelectedTemplate(null)
    setTitle('')
    setDescription('')
    setCategory('software')
    setPriority('medium')
  }

  if (!currentUser) return null

  const titleError = submitted && !title.trim() ? '请输入工单标题' : ''
  const descriptionError = submitted
    ? !description.trim()
      ? '请输入工单描述'
      : description.trim().length < 10
        ? '描述至少需要10个字符'
        : ''
    : ''
  const scheduledTimeError = submitted && createMode === 'scheduled'
    ? !scheduledTime.trim()
      ? '请选择生效时间'
      : new Date(scheduledTime).getTime() <= Date.now()
        ? '生效时间必须晚于当前时间'
        : ''
    : ''

  const datetimeLocalMin = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16)

  const formatDateTime = (iso: string): string => {
    const d = new Date(iso)
    const yyyy = d.getFullYear()
    const MM = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const HH = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}`
  }

  const handleSubmit = () => {
    setSubmitted(true)
    if (titleError || descriptionError || scheduledTimeError) return

    if (createMode === 'scheduled') {
      const newScheduled = addScheduledTicket({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        creatorId: currentUser.id,
        assigneeId: assigneeId || null,
        departmentId: departmentId || null,
        tags: tagIds,
        scheduledTime: new Date(scheduledTime).toISOString(),
      })

      toast({
        title: '预约创建成功',
        description: `预约工单 ${newScheduled.id} 将于 ${formatDateTime(newScheduled.scheduledTime)} 自动创建`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      })

      navigate('/scheduled-tickets')
      return
    }

    const newTicket = addTicket({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      creatorId: currentUser.id,
      assigneeId: assigneeId || null,
      departmentId: departmentId || null,
      tags: tagIds,
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
              {activeTemplates.length > 0 && (
                <FormControl>
                  <FormLabel>选择模板</FormLabel>
                  <Popover placement="bottom-start" trigger="click">
                    <PopoverTrigger>
                      <Button
                        w="100%"
                        variant="outline"
                        rightIcon={<ChevronDown size={16} />}
                        leftIcon={<FileText size={16} color="#6C5CE7" />}
                        justifyContent="flex-start"
                        fontWeight="normal"
                        color={selectedTemplate ? 'gray.800' : 'gray.500'}
                      >
                        {selectedTemplate ? selectedTemplate.name : '点击选择模板（可选）'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent w="400px">
                      <PopoverArrow />
                      <PopoverHeader fontWeight="600">常用工单模板</PopoverHeader>
                      <PopoverBody p={2}>
                        <Stack spacing={2}>
                          {activeTemplates.map((template) => (
                            <Box
                              key={template.id}
                              p={3}
                              borderRadius="8px"
                              cursor="pointer"
                              bg={selectedTemplate?.id === template.id ? 'brand.50' : 'gray.50'}
                              border={selectedTemplate?.id === template.id ? '1px solid' : '1px solid transparent'}
                              borderColor="brand.300"
                              _hover={{ bg: 'brand.50' }}
                              onClick={() => handleSelectTemplate(template)}
                              transition="all 0.2s"
                            >
                              <HStack justify="space-between" mb={1}>
                                <Text fontWeight="500" fontSize="sm">{template.name}</Text>
                                <HStack spacing={1}>
                                  <Badge colorScheme="brand" variant="subtle" fontSize="xs">
                                    {CATEGORY_LABELS[template.category]}
                                  </Badge>
                                  <Badge
                                    color="white"
                                    bg={PRIORITY_COLORS[template.priority]}
                                    fontSize="xs"
                                    variant="solid"
                                  >
                                    {PRIORITY_LABELS[template.priority]}
                                  </Badge>
                                </HStack>
                              </HStack>
                              <Text fontSize="xs" color="gray.500" noOfLines={2}>
                                {template.description}
                              </Text>
                            </Box>
                          ))}
                        </Stack>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                  {selectedTemplate && (
                    <HStack mt={2} spacing={2}>
                      <Text fontSize="xs" color="brand.600">
                        已应用模板：{selectedTemplate.name}
                      </Text>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={handleClearTemplate}
                        color="gray.500"
                      >
                        清除
                      </Button>
                    </HStack>
                  )}
                </FormControl>
              )}

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
                <FormLabel>标签 <Text as="span" fontSize="xs" color="gray.400" fontWeight="normal">可多选，与分类相互独立</Text></FormLabel>
                <TagSelect value={tagIds} onChange={setTagIds} />
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
                <FormLabel>指派部门</FormLabel>
                <Select
                  value={departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  placeholder="请选择部门（可选）"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>指派处理人{departmentId && <Badge ml={2} colorScheme="brand" variant="subtle" fontSize="xs">{departmentId ? '部门内成员' : ''}</Badge>}</FormLabel>
                <Select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder={departmentId ? '请选择部门内处理人（可选）' : '请选择处理人（可选）'}
                  isDisabled={departmentId && agents.length === 0}
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </Select>
                {departmentId && agents.length === 0 && (
                  <Text fontSize="xs" color="orange.500" mt={1}>该部门暂无处理人</Text>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>创建方式</FormLabel>
                <RadioGroup
                  value={createMode}
                  onChange={(value) => setCreateMode(value as 'immediate' | 'scheduled')}
                >
                  <HStack spacing={6}>
                    <Radio value="immediate">立即创建</Radio>
                    <Radio value="scheduled">预约创建</Radio>
                  </HStack>
                </RadioGroup>
              </FormControl>

              {createMode === 'scheduled' && (
                <FormControl isInvalid={!!scheduledTimeError}>
                  <FormLabel>生效时间</FormLabel>
                  <Input
                    type="datetime-local"
                    value={scheduledTime}
                    min={datetimeLocalMin}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    系统将在该时间点自动创建工单，预约期间可在「预约工单」中查看或取消
                  </Text>
                  {scheduledTimeError && <FormErrorMessage>{scheduledTimeError}</FormErrorMessage>}
                </FormControl>
              )}

              <HStack spacing={3} pt={2}>
                <Button
                  colorScheme="brand"
                  leftIcon={createMode === 'scheduled' ? <CalendarClock size={16} /> : <Send size={16} />}
                  onClick={handleSubmit}
                >
                  {createMode === 'scheduled' ? '预约创建' : '提交工单'}
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
