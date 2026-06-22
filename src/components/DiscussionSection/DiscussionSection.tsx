import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Textarea,
  Button,
  Icon,
  Avatar,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  Collapse,
} from '@chakra-ui/react'
import {
  MessageSquare,
  MoreHorizontal,
  Reply,
  Edit,
  Trash2,
  Quote,
  ChevronDown,
  ChevronUp,
  Send,
  User as UserIcon,
  FileText,
} from 'lucide-react'
import { useTicketStore } from '@/store/ticketStore'
import type { TicketComment, TicketRecord, User } from '@/types'

interface DiscussionSectionProps {
  ticketId: string
  currentUser: User
  users: User[]
  records: TicketRecord[]
  isReadOnly?: boolean
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`
}

function getUserName(userId: string, users: User[]): string {
  const user = users.find(u => u.id === userId)
  return user ? user.name : '未知用户'
}

function getUserColor(userId: string): string {
  const colors = [
    '#6C5CE7', '#00B894', '#0984E3', '#E17055',
    '#00CEC9', '#FDCB6E', '#E84393', '#A29BFE',
    '#74B9FF', '#FF7675', '#55EFC4', '#FFEAA7',
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

interface CommentItemProps {
  comment: TicketComment
  replies: TicketComment[]
  currentUser: User
  users: User[]
  records: TicketRecord[]
  onReply: (parentId: string, parentAuthorName: string) => void
  onQuoteRecord: (recordId: string) => void
  isReadOnly?: boolean
}

function CommentItem({
  comment,
  replies,
  currentUser,
  users,
  records,
  onReply,
  onQuoteRecord,
  isReadOnly,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [showFullContent, setShowFullContent] = useState(true)
  const toast = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { updateComment, deleteComment } = useTicketStore()

  const authorName = getUserName(comment.authorId, users)
  const authorColor = getUserColor(comment.authorId)
  const quotedRecord = comment.quotedRecordId
    ? records.find(r => r.id === comment.quotedRecordId)
    : null
  const isAuthor = currentUser.id === comment.authorId
  const isLongContent = comment.content.length > 200

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleEdit = () => {
    setEditContent(comment.content)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      toast({ title: '评论内容不能为空', status: 'warning', duration: 2000 })
      return
    }
    updateComment(comment.id, editContent, currentUser.id)
    setIsEditing(false)
    toast({ title: '评论已更新', status: 'success', duration: 2000 })
  }

  const handleCancelEdit = () => {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (window.confirm('确定要删除这条评论吗？回复也会一起删除。')) {
      const success = deleteComment(comment.id, currentUser.id)
      if (success) {
        toast({ title: '评论已删除', status: 'success', duration: 2000 })
      } else {
        toast({ title: '删除失败，您没有权限', status: 'error', duration: 2000 })
      }
    }
  }

  const handleReply = () => {
    onReply(comment.id, authorName)
  }

  const handleQuoteRecord = () => {
    if (quotedRecord) {
      onQuoteRecord(quotedRecord.id)
    }
  }

  return (
    <Box>
      <HStack align="flex-start" spacing={3} w="full">
        <Avatar
          size="sm"
          bg={authorColor}
          color="white"
          name={authorName}
          icon={<Icon as={UserIcon} size={14} />}
          flexShrink={0}
        />

        <Box flex={1} minW={0}>
          <HStack spacing={2} mb={1}>
            <Text fontSize="sm" fontWeight="600" color="#2D3748">
              {authorName}
            </Text>
            <Tooltip label={new Date(comment.createdAt).toLocaleString()}>
              <Text fontSize="xs" color="gray.400">
                {formatTime(comment.createdAt)}
              </Text>
            </Tooltip>
            {comment.updatedAt !== comment.createdAt && (
              <Badge variant="outline" colorScheme="gray" fontSize="xs">
                已编辑
              </Badge>
            )}
          </HStack>

          {quotedRecord && (
            <Box
              mb={2}
              p={2}
              bg="blue.50"
              borderLeft="3px solid"
              borderColor="blue.400"
              borderRadius="0 6px 6px 0"
              cursor="pointer"
              onClick={handleQuoteRecord}
              _hover={{ bg: 'blue.100' }}
              transition="all 0.15s ease"
            >
              <HStack spacing={1} mb={1}>
                <Icon as={FileText} size={12} color="blue.500" />
                <Text fontSize="xs" fontWeight="500" color="blue.600">
                  引用处理记录
                </Text>
              </HStack>
              <Text fontSize="xs" color="blue.700" noOfLines={2}>
                {quotedRecord.content}
              </Text>
            </Box>
          )}

          {isEditing ? (
            <VStack align="stretch" spacing={2}>
              <Textarea
                ref={textareaRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                size="sm"
                borderRadius="8px"
                rows={3}
                fontSize="sm"
              />
              <HStack spacing={2}>
                <Button size="xs" colorScheme="blue" onClick={handleSaveEdit}>
                  保存
                </Button>
                <Button size="xs" variant="ghost" onClick={handleCancelEdit}>
                  取消
                </Button>
              </HStack>
            </VStack>
          ) : (
            <>
              <Collapse startingHeight={isLongContent ? 80 : undefined} in={showFullContent}>
                <Text
                  fontSize="sm"
                  color="#4A5568"
                  lineHeight="1.6"
                  whiteSpace="pre-wrap"
                  wordBreak="break-word"
                >
                  {comment.content}
                </Text>
              </Collapse>
              {isLongContent && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  mt={1}
                  onClick={() => setShowFullContent(!showFullContent)}
                  p={0}
                  h="auto"
                  fontSize="xs"
                >
                  {showFullContent ? '收起' : '展开全文'}
                  <Icon as={showFullContent ? ChevronUp : ChevronDown} size={12} ml={1} />
                </Button>
              )}
            </>
          )}

          {!isEditing && !isReadOnly && (
            <HStack spacing={3} mt={2}>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="gray"
                leftIcon={<Icon as={Reply} size={12} />}
                onClick={handleReply}
                p={1}
                h="auto"
                fontSize="xs"
              >
                回复
              </Button>

              {isAuthor && (
                <Menu>
                  <MenuButton
                    as={Button}
                    size="xs"
                    variant="ghost"
                    colorScheme="gray"
                    p={1}
                    h="auto"
                  >
                    <Icon as={MoreHorizontal} size={14} />
                  </MenuButton>
                  <MenuList fontSize="sm" minW="120px">
                    <MenuItem icon={<Icon as={Edit} size={14} />} onClick={handleEdit}>
                      编辑
                    </MenuItem>
                    <MenuItem
                      icon={<Icon as={Trash2} size={14} />}
                      color="red.500"
                      onClick={handleDelete}
                    >
                      删除
                    </MenuItem>
                  </MenuList>
                </Menu>
              )}
            </HStack>
          )}

          {replies.length > 0 && (
            <Box mt={3} pl={4} borderLeft="2px solid" borderColor="gray.100">
              <Button
                size="xs"
                variant="ghost"
                colorScheme="gray"
                mb={2}
                onClick={() => setShowReplies(!showReplies)}
                p={0}
                h="auto"
                fontSize="xs"
                leftIcon={<Icon as={showReplies ? ChevronDown : ChevronUp} size={12} />}
              >
                {replies.length} 条回复
              </Button>

              <Collapse in={showReplies}>
                <VStack align="stretch" spacing={3}>
                  {replies.map(reply => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      replies={[]}
                      currentUser={currentUser}
                      users={users}
                      records={records}
                      onReply={onReply}
                      onQuoteRecord={onQuoteRecord}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </VStack>
              </Collapse>
            </Box>
          )}
        </Box>
      </HStack>
    </Box>
  )
}

export default function DiscussionSection({
  ticketId,
  currentUser,
  users,
  records,
  isReadOnly = false,
}: DiscussionSectionProps) {
  const { getCommentsByTicketId, addComment } = useTicketStore()
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [quotedRecordId, setQuotedRecordId] = useState<string | null>(null)
  const [showQuoteSelector, setShowQuoteSelector] = useState(false)
  const toast = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const comments = getCommentsByTicketId(ticketId)

  const { topLevelComments, replyMap } = useMemo(() => {
    const topLevel: TicketComment[] = []
    const replies: Record<string, TicketComment[]> = {}

    comments.forEach(comment => {
      if (comment.parentId) {
        if (!replies[comment.parentId]) {
          replies[comment.parentId] = []
        }
        replies[comment.parentId].push(comment)
      } else {
        topLevel.push(comment)
      }
    })

    return {
      topLevelComments: topLevel,
      replyMap: replies,
    }
  }, [comments])

  const quotedRecord = quotedRecordId
    ? records.find(r => r.id === quotedRecordId)
    : null

  const handleReply = (parentId: string, parentAuthorName: string) => {
    setReplyTo({ id: parentId, name: parentAuthorName })
    setShowQuoteSelector(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleQuoteRecord = (recordId: string) => {
    setQuotedRecordId(recordId)
    setShowQuoteSelector(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleClearReply = () => {
    setReplyTo(null)
  }

  const handleClearQuote = () => {
    setQuotedRecordId(null)
  }

  const handleSubmit = () => {
    if (!newComment.trim()) {
      toast({ title: '请输入评论内容', status: 'warning', duration: 2000 })
      return
    }

    addComment(
      ticketId,
      currentUser.id,
      newComment,
      replyTo?.id || null,
      quotedRecordId
    )

    setNewComment('')
    setReplyTo(null)
    setQuotedRecordId(null)
    toast({ title: '评论已发送', status: 'success', duration: 2000 })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const formatRecordLabel = (record: TicketRecord) => {
    const date = new Date(record.createdAt)
    const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    const author = getUserName(record.operatorId, users)
    return `${timeStr} · ${author} · ${record.content.slice(0, 30)}${record.content.length > 30 ? '...' : ''}`
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack spacing={2}>
        <Icon as={MessageSquare} size={18} color="#6C5CE7" />
        <Text fontSize="sm" fontWeight="600" color="#2D3748" flex={1}>
          讨论区
          <Badge ml={2} colorScheme="purple" variant="subtle" fontSize="xs">
            {comments.length} 条
          </Badge>
        </Text>
      </HStack>

      {!isReadOnly && (
        <Box
          p={4}
          bg="gray.50"
          borderRadius="12px"
          border="1px solid"
          borderColor="gray.100"
        >
          <HStack align="flex-start" spacing={3}>
            <Avatar
              size="sm"
              bg={getUserColor(currentUser.id)}
              color="white"
              name={currentUser.name}
              icon={<Icon as={UserIcon} size={14} />}
              flexShrink={0}
            />
            <Box flex={1} minW={0}>
              {replyTo && (
                <HStack
                  spacing={2}
                  mb={2}
                  p={2}
                  bg="purple.50"
                  borderRadius="6px"
                  fontSize="xs"
                >
                  <Icon as={Reply} size={12} color="purple.500" />
                  <Text color="purple.600">
                    回复 <Text as="span" fontWeight="600">{replyTo.name}</Text>
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={handleClearReply}
                    p={0}
                    h="auto"
                    ml="auto"
                  >
                    取消
                  </Button>
                </HStack>
              )}

              {quotedRecord && (
                <Box
                  mb={2}
                  p={2}
                  bg="blue.50"
                  borderLeft="3px solid"
                  borderColor="blue.400"
                  borderRadius="0 6px 6px 0"
                >
                  <HStack spacing={1} mb={1}>
                    <Icon as={Quote} size={12} color="blue.500" />
                    <Text fontSize="xs" fontWeight="500" color="blue.600">
                      引用处理记录
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="gray"
                      onClick={handleClearQuote}
                      p={0}
                      h="auto"
                      ml="auto"
                    >
                      取消
                    </Button>
                  </HStack>
                  <Text fontSize="xs" color="blue.700" noOfLines={1}>
                    {quotedRecord.content}
                  </Text>
                </Box>
              )}

              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={replyTo ? `回复 ${replyTo.name}...` : '发表你的看法...'}
                size="sm"
                borderRadius="8px"
                rows={3}
                resize="vertical"
                fontSize="sm"
                bg="white"
              />

              <HStack spacing={2} mt={2}>
                <Menu isOpen={showQuoteSelector} onClose={() => setShowQuoteSelector(false)}>
                  <MenuButton
                    as={Button}
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    leftIcon={<Icon as={Quote} size={14} />}
                    onClick={() => setShowQuoteSelector(!showQuoteSelector)}
                  >
                    引用处理记录
                  </MenuButton>
                  <MenuList
                    maxH="300px"
                    overflowY="auto"
                    minW="300px"
                    fontSize="sm"
                  >
                    {records.length === 0 ? (
                      <MenuItem isDisabled>暂无处理记录</MenuItem>
                    ) : (
                      records.map(record => (
                        <MenuItem
                          key={record.id}
                          onClick={() => handleQuoteRecord(record.id)}
                        >
                          {formatRecordLabel(record)}
                        </MenuItem>
                      ))
                    )}
                  </MenuList>
                </Menu>

                <Button
                  colorScheme="purple"
                  size="sm"
                  leftIcon={<Icon as={Send} size={14} />}
                  onClick={handleSubmit}
                  isDisabled={!newComment.trim()}
                  ml="auto"
                >
                  发送
                </Button>
              </HStack>
              <Text fontSize="xs" color="gray.400" mt={1}>
                按 Cmd/Ctrl + Enter 快速发送
              </Text>
            </Box>
          </HStack>
        </Box>
      )}

      <Divider />

      {topLevelComments.length === 0 ? (
        <VStack py={8} spacing={2}>
          <Icon as={MessageSquare} size={32} color="gray.200" />
          <Text fontSize="sm" color="gray.400">
            暂无讨论，快来发表第一条评论吧！
          </Text>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          {topLevelComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={replyMap[comment.id] || []}
              currentUser={currentUser}
              users={users}
              records={records}
              onReply={handleReply}
              onQuoteRecord={handleQuoteRecord}
              isReadOnly={isReadOnly}
            />
          ))}
        </VStack>
      )}
    </VStack>
  )
}
