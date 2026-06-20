import { useState, useMemo, useRef, useEffect } from 'react'
import { useKnowledgeStore } from '@/store/knowledgeStore'
import { useUserStore } from '@/store/userStore'
import { useTicketStore } from '@/store/ticketStore'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Box,
  Card,
  CardBody,
  Heading,
  VStack,
  HStack,
  Input,
  Button,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
  Textarea,
  useToast,
  FormControl,
  FormLabel,
  Divider,
  Icon,
  IconButton,
  Tooltip,
  Flex,
} from '@chakra-ui/react'
import {
  ArrowLeft,
  Save,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  FileCode,
  Eye,
  EyeOff,
  Image,
  Minus,
  BookOpen,
} from 'lucide-react'
import { CATEGORY_LABELS, CATEGORY_VALUES, type TicketCategory } from '@/types'

type EditorMode = 'edit' | 'preview'

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

function WrapSurround({
  textareaRef,
  setContent,
  prefix,
  suffix = prefix,
  placeholder,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  setContent: (s: string) => void
  prefix: string
  suffix?: string
  placeholder: string
}) {
  const ta = textareaRef.current
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const value = ta.value
  const selected = value.substring(start, end) || placeholder
  const insert = `${prefix}${selected}${suffix}`
  const next = value.substring(0, start) + insert + value.substring(end)
  setContent(next)
  requestAnimationFrame(() => {
    ta.focus()
    const pos = start + prefix.length
    ta.setSelectionRange(pos, pos + selected.length)
  })
}

function WrapLine({
  textareaRef,
  setContent,
  prefix,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  setContent: (s: string) => void
  prefix: string
}) {
  const ta = textareaRef.current
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const value = ta.value
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const next = value.substring(0, lineStart) + prefix + value.substring(lineStart)
  setContent(next)
  requestAnimationFrame(() => {
    ta.focus()
    const offset = prefix.length
    ta.setSelectionRange(start + offset, end + offset)
  })
}

export default function KnowledgeEdit() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  const addArticle = useKnowledgeStore((s) => s.addArticle)
  const updateArticle = useKnowledgeStore((s) => s.updateArticle)
  const getArticleById = useKnowledgeStore((s) => s.getArticleById)
  const currentUser = useUserStore((s) => s.currentUser)
  const tickets = useTicketStore((s) => s.tickets)

  const original = id ? getArticleById(id) : undefined

  const [title, setTitle] = useState(original?.title ?? '')
  const [category, setCategory] = useState<TicketCategory>(original?.category ?? 'software')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(original?.tags ?? [])
  const [content, setContent] = useState(original?.content ?? '')
  const [relatedTicketId, setRelatedTicketId] = useState<string>(original?.relatedTicketId ?? '')
  const [mode, setMode] = useState<EditorMode>('edit')
  const [saving, setSaving] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.role !== 'admin') {
      toast({ status: 'error', title: '无权限', description: '仅管理员可发布和编辑知识库文章' })
      navigate('/knowledge')
    }
  }, [currentUser, navigate, toast])

  const previewHTML = useMemo(() => renderMarkdownToHTML(content), [content])

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (!t) return
    if (tags.includes(t)) {
      setTagInput('')
      return
    }
    if (tags.length >= 10) {
      toast({ status: 'warning', title: '标签过多', description: '最多添加 10 个标签' })
      return
    }
    setTags([...tags, t])
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSave = () => {
    if (!currentUser) return
    if (!title.trim()) {
      toast({ status: 'error', title: '缺少标题', description: '请输入文章标题' })
      return
    }
    if (!content.trim()) {
      toast({ status: 'error', title: '缺少内容', description: '请输入文章内容' })
      return
    }
    setSaving(true)
    try {
      if (isEdit && id) {
        const result = updateArticle(id, {
          title: title.trim(),
          content,
          category,
          tags,
          relatedTicketId: relatedTicketId || null,
        })
        if (result) {
          toast({ status: 'success', title: '更新成功', description: '文章已保存' })
          navigate(`/knowledge/${id}`)
        } else {
          toast({ status: 'error', title: '更新失败', description: '文章不存在' })
        }
      } else {
        const created = addArticle({
          title: title.trim(),
          content,
          category,
          tags,
          relatedTicketId: relatedTicketId || null,
          authorId: currentUser.id,
        })
        toast({ status: 'success', title: '发布成功', description: '文章已发布' })
        navigate(`/knowledge/${created.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const relatedTicketOptions = useMemo(
    () => [{ id: '', title: '（不关联工单）' }, ...tickets.map((t) => ({ id: t.id, title: `${t.id} - ${t.title}` }))],
    [tickets]
  )

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <HStack spacing={3}>
          <Link to="/knowledge" style={{ textDecoration: 'none' }}>
            <Button leftIcon={<Icon as={ArrowLeft} />} variant="ghost" colorScheme="brand">
              返回知识库
            </Button>
          </Link>
          <HStack spacing={3}>
            <Icon as={BookOpen} boxSize={6} color="brand.500" />
            <Heading size="lg">{isEdit ? '编辑文章' : '发布新文章'}</Heading>
          </HStack>
        </HStack>
        <HStack>
          <Button
            variant={mode === 'edit' ? 'solid' : 'outline'}
            colorScheme={mode === 'edit' ? 'brand' : 'gray'}
            leftIcon={<Icon as={mode === 'edit' ? EyeOff : Eye} />}
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          >
            {mode === 'edit' ? '预览' : '编辑'}
          </Button>
          <Button
            colorScheme="brand"
            leftIcon={<Icon as={Save} />}
            isLoading={saving}
            onClick={handleSave}
          >
            {isEdit ? '保存修改' : '发布文章'}
          </Button>
        </HStack>
      </HStack>

      <Card>
        <CardBody>
          <VStack align="stretch" spacing={5}>
            <FormControl isRequired>
              <FormLabel>文章标题</FormLabel>
              <Input
                size="lg"
                placeholder="请输入文章标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormControl>

            <SimpleGrid columns={2} spacing={5}>
              <FormControl isRequired>
                <FormLabel>文章分类</FormLabel>
                <Select
                  size="lg"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                >
                  {CATEGORY_VALUES.map((val) => (
                    <option key={val} value={val}>
                      {CATEGORY_LABELS[val as TicketCategory]}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>关联工单（可选）</FormLabel>
                <Select
                  size="lg"
                  value={relatedTicketId}
                  onChange={(e) => setRelatedTicketId(e.target.value)}
                >
                  {relatedTicketOptions.map((opt) => (
                    <option key={opt.id || 'none'} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>标签（按 Enter 或逗号添加，最多 10 个）</FormLabel>
              <VStack align="stretch" spacing={2}>
                <HStack>
                  <Input
                    placeholder="输入标签名"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={handleAddTag}
                  />
                  <Button variant="outline" colorScheme="brand" onClick={handleAddTag}>
                    添加
                  </Button>
                </HStack>
                {tags.length > 0 && (
                  <HStack flexWrap="wrap" spacing={2}>
                    {tags.map((tag) => (
                      <Tag key={tag} size="lg" colorScheme="brand" borderRadius="full" variant="subtle">
                        <TagLabel>{tag}</TagLabel>
                        <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                      </Tag>
                    ))}
                  </HStack>
                )}
              </VStack>
            </FormControl>

            <Divider />

            <FormControl isRequired>
              <FormLabel>正文内容（支持 Markdown 格式）</FormLabel>
              <Box
                border="1px solid"
                borderColor="gray.200"
                borderRadius="12px"
                overflow="hidden"
                bg={mode === 'preview' ? 'gray.50' : 'white'}
              >
                {mode === 'edit' && (
                  <HStack
                    px={3}
                    py={2}
                    bg="gray.50"
                    borderBottom="1px solid"
                    borderColor="gray.200"
                    spacing={1}
                    flexWrap="wrap"
                  >
                    <Tooltip label="一级标题">
                      <IconButton
                        aria-label="h1"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Heading1} boxSize={4} />}
                        onClick={() =>
                          WrapLine({ textareaRef, setContent, prefix: '# ' })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="二级标题">
                      <IconButton
                        aria-label="h2"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Heading2} boxSize={4} />}
                        onClick={() =>
                          WrapLine({ textareaRef, setContent, prefix: '## ' })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="三级标题">
                      <IconButton
                        aria-label="h3"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Heading3} boxSize={4} />}
                        onClick={() =>
                          WrapLine({ textareaRef, setContent, prefix: '### ' })
                        }
                      />
                    </Tooltip>
                    <Divider orientation="vertical" h="20px" mx={2} />
                    <Tooltip label="加粗">
                      <IconButton
                        aria-label="bold"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Bold} boxSize={4} />}
                        onClick={() =>
                          WrapSurround({
                            textareaRef,
                            setContent,
                            prefix: '**',
                            suffix: '**',
                            placeholder: '加粗文字',
                          })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="斜体">
                      <IconButton
                        aria-label="italic"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Italic} boxSize={4} />}
                        onClick={() =>
                          WrapSurround({
                            textareaRef,
                            setContent,
                            prefix: '*',
                            suffix: '*',
                            placeholder: '斜体文字',
                          })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="行内代码">
                      <IconButton
                        aria-label="code"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Code} boxSize={4} />}
                        onClick={() =>
                          WrapSurround({
                            textareaRef,
                            setContent,
                            prefix: '`',
                            suffix: '`',
                            placeholder: 'code',
                          })
                        }
                      />
                    </Tooltip>
                    <Divider orientation="vertical" h="20px" mx={2} />
                    <Tooltip label="无序列表">
                      <IconButton
                        aria-label="ul"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={List} boxSize={4} />}
                        onClick={() =>
                          WrapLine({ textareaRef, setContent, prefix: '- ' })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="有序列表">
                      <IconButton
                        aria-label="ol"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={ListOrdered} boxSize={4} />}
                        onClick={() =>
                          WrapLine({ textareaRef, setContent, prefix: '1. ' })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="引用">
                      <IconButton
                        aria-label="quote"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Quote} boxSize={4} />}
                        onClick={() =>
                          WrapLine({ textareaRef, setContent, prefix: '> ' })
                        }
                      />
                    </Tooltip>
                    <Divider orientation="vertical" h="20px" mx={2} />
                    <Tooltip label="插入链接">
                      <IconButton
                        aria-label="link"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Link2} boxSize={4} />}
                        onClick={() =>
                          WrapSurround({
                            textareaRef,
                            setContent,
                            prefix: '[',
                            suffix: '](https://)',
                            placeholder: '链接文本',
                          })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="插入图片">
                      <IconButton
                        aria-label="image"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Image} boxSize={4} />}
                        onClick={() =>
                          WrapSurround({
                            textareaRef,
                            setContent,
                            prefix: '![',
                            suffix: '](https://)',
                            placeholder: '图片描述',
                          })
                        }
                      />
                    </Tooltip>
                    <Tooltip label="分割线">
                      <IconButton
                        aria-label="hr"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={Minus} boxSize={4} />}
                        onClick={() => {
                          const ta = textareaRef.current
                          if (!ta) return
                          const start = ta.selectionStart
                          const value = ta.value
                          const insert = '\n\n---\n\n'
                          setContent(value.substring(0, start) + insert + value.substring(start))
                          requestAnimationFrame(() => {
                            ta.focus()
                            const pos = start + insert.length
                            ta.setSelectionRange(pos, pos)
                          })
                        }}
                      />
                    </Tooltip>
                    <Divider orientation="vertical" h="20px" mx={2} />
                    <Tooltip label="代码块">
                      <IconButton
                        aria-label="codeblock"
                        size="sm"
                        variant="ghost"
                        icon={<Icon as={FileCode} boxSize={4} />}
                        onClick={() => {
                          const ta = textareaRef.current
                          if (!ta) return
                          const start = ta.selectionStart
                          const end = ta.selectionEnd
                          const value = ta.value
                          const selected = value.substring(start, end) || '在这里输入代码'
                          const insert = `\n\n\`\`\`\n${selected}\n\`\`\`\n\n`
                          setContent(value.substring(0, start) + insert + value.substring(end))
                          requestAnimationFrame(() => {
                            ta.focus()
                            const pos = start + 5
                            ta.setSelectionRange(pos, pos + selected.length)
                          })
                        }}
                      />
                    </Tooltip>
                  </HStack>
                )}

                {mode === 'edit' ? (
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`示例 Markdown：

## 标题

这是一段正文，支持 **加粗**、*斜体*、\`行内代码\`。

### 列表

- 项目一
- 项目二

1. 步骤一
2. 步骤二

> 引用一段内容

\`\`\`
代码块
\`\`\`
`}
                    minH="500px"
                    p={4}
                    border="none"
                    _focusVisible={{ boxShadow: 'none' }}
                    fontFamily="monospace"
                    fontSize="sm"
                    lineHeight="1.7"
                    resize="vertical"
                  />
                ) : (
                  <Box
                    p={6}
                    minH="500px"
                    bg="white"
                    dangerouslySetInnerHTML={{ __html: previewHTML || '<p style="color:#a0aec0;">暂无内容</p>' }}
                  />
                )}
              </Box>
            </FormControl>

            <Flex justify="flex-end" pt={2}>
              <HStack>
                <Button variant="outline" onClick={() => navigate('/knowledge')}>
                  取消
                </Button>
                <Button
                  colorScheme="brand"
                  leftIcon={<Icon as={Save} />}
                  isLoading={saving}
                  onClick={handleSave}
                >
                  {isEdit ? '保存修改' : '发布文章'}
                </Button>
              </HStack>
            </Flex>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  )
}

// 本地 SimpleGrid 别名，避免文件顶多引一行
function SimpleGrid({
  columns,
  spacing,
  children,
}: {
  columns: number
  spacing: number | string
  children: React.ReactNode
}) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(${columns}, minmax(0, 1fr))`}
      gap={spacing}
    >
      {children}
    </Box>
  )
}
