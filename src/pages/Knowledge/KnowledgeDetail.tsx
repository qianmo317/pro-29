import { useMemo, useRef } from 'react'
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
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Tooltip,
  IconButton,
} from '@chakra-ui/react'
import { ArrowLeft, BookOpen, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { CATEGORY_LABELS } from '@/types'
import { useTicketStore } from '@/store/ticketStore'

function renderMarkdownToHTML(md: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const lines = md.split('\n')
  const html: string[] = []
  let inCodeBlock = false
  let codeLang = ''
  let codeBuffer: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' | null = null
  let paragraphBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      let text = paragraphBuffer.join(' ')
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
      text = text.replace(/`(.+?)`/g, '<code style="background:#f6f8fa;padding:2px 6px;border-radius:4px;color:#d6336c;">$1</code>')
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#3182CE;text-decoration:underline;">$1</a>')
      html.push(`<p style="margin:12px 0;line-height:1.7;">${text}</p>`)
      paragraphBuffer = []
    }
  }

  const closeList = () => {
    if (inList && listType) {
      html.push(`</${listType}>`)
      inList = false
      listType = null
    }
  }

  const processInline = (content: string) => {
    let t = escape(content)
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>')
    t = t.replace(/`(.+?)`/g, '<code style="background:#f6f8fa;padding:2px 6px;border-radius:4px;color:#d6336c;">$1</code>')
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#3182CE;text-decoration:underline;">$1</a>')
    return t
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (inCodeBlock) {
      if (line.trim().startsWith('```')) {
        const code = codeBuffer.join('\n')
        html.push(
          `<pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-size:14px;margin:12px 0;"><code class="lang-${escape(codeLang)}">${escape(code)}</code></pre>`
        )
        inCodeBlock = false
        codeLang = ''
        codeBuffer = []
      } else {
        codeBuffer.push(line)
      }
      continue
    }

    if (line.trim().startsWith('```')) {
      flushParagraph()
      closeList()
      inCodeBlock = true
      codeLang = line.trim().slice(3).trim()
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      closeList()
      continue
    }

    const h1 = /^# (.+)$/.exec(line)
    if (h1) {
      flushParagraph()
      closeList()
      html.push(`<h1 style="font-size:24px;font-weight:700;margin:24px 0 12px 0;color:#1a202c;">${processInline(h1[1])}</h1>`)
      continue
    }
    const h2 = /^## (.+)$/.exec(line)
    if (h2) {
      flushParagraph()
      closeList()
      html.push(`<h2 style="font-size:20px;font-weight:700;margin:20px 0 10px 0;color:#1a202c;">${processInline(h2[1])}</h2>`)
      continue
    }
    const h3 = /^### (.+)$/.exec(line)
    if (h3) {
      flushParagraph()
      closeList()
      html.push(`<h3 style="font-size:17px;font-weight:700;margin:16px 0 8px 0;color:#1a202c;">${processInline(h3[1])}</h3>`)
      continue
    }

    const hr = /^---+$/.exec(line)
    if (hr) {
      flushParagraph()
      closeList()
      html.push(`<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />`)
      continue
    }

    const blockquote = /^> (.+)$/.exec(line)
    if (blockquote) {
      flushParagraph()
      closeList()
      html.push(
        `<blockquote style="border-left:4px solid #3182CE;padding:8px 16px;margin:12px 0;background:#ebf8ff;color:#2c5282;border-radius:0 6px 6px 0;">${processInline(blockquote[1])}</blockquote>`
      )
      continue
    }

    const ul = /^[-*] (.+)$/.exec(line)
    if (ul) {
      flushParagraph()
      if (!inList || listType !== 'ul') {
        closeList()
        html.push(`<ul style="margin:12px 0;padding-left:28px;">`)
        inList = true
        listType = 'ul'
      }
      html.push(`<li style="margin:4px 0;line-height:1.7;">${processInline(ul[1])}</li>`)
      continue
    }

    const ol = /^(\d+)\. (.+)$/.exec(line)
    if (ol) {
      flushParagraph()
      if (!inList || listType !== 'ol') {
        closeList()
        html.push(`<ol style="margin:12px 0;padding-left:28px;">`)
        inList = true
        listType = 'ol'
      }
      html.push(`<li style="margin:4px 0;line-height:1.7;">${processInline(ol[2])}</li>`)
      continue
    }

    closeList()
    paragraphBuffer.push(line)
  }

  flushParagraph()
  closeList()
  if (inCodeBlock && codeBuffer.length > 0) {
    html.push(
      `<pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-size:14px;margin:12px 0;"><code>${escape(codeBuffer.join('\n'))}</code></pre>`
    )
  }

  return html.join('\n')
}

export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const getArticleById = useKnowledgeStore((s) => s.getArticleById)
  const deleteArticle = useKnowledgeStore((s) => s.deleteArticle)
  const users = useUserStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)
  const getTicketById = useTicketStore((s) => s.getTicketById)

  const isAdmin = currentUser?.role === 'admin'
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)

  const article = id ? getArticleById(id) : undefined
  const contentHTML = useMemo(() => (article ? renderMarkdownToHTML(article.content) : ''), [article])

  const handleConfirmDelete = () => {
    if (!id) return
    const ok = deleteArticle(id)
    if (ok) {
      toast({ status: 'success', title: '删除成功', description: '文章已删除' })
      navigate('/knowledge')
    } else {
      toast({ status: 'error', title: '删除失败', description: '文章不存在' })
    }
    onClose()
  }

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
      <HStack justify="space-between" mb={6}>
        <HStack>
          <Button
            leftIcon={<Icon as={ArrowLeft} />}
            variant="ghost"
            colorScheme="brand"
            onClick={() => navigate('/knowledge')}
          >
            知识库
          </Button>
        </HStack>
        {isAdmin && (
          <HStack>
            <Tooltip label="编辑文章">
              <Button
                leftIcon={<Icon as={Pencil} />}
                variant="outline"
                colorScheme="brand"
                onClick={() => navigate(`/knowledge/${article.id}/edit`)}
              >
                编辑
              </Button>
            </Tooltip>
            <Tooltip label="删除文章">
              <IconButton
                aria-label="delete"
                colorScheme="red"
                variant="outline"
                icon={<Icon as={Trash2} />}
                onClick={onOpen}
              />
            </Tooltip>
          </HStack>
        )}
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

            <Box lineHeight="tall" dangerouslySetInnerHTML={{ __html: contentHTML }} />
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
