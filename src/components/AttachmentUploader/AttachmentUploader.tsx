import { useRef, useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  useToast,
  CloseButton,
} from '@chakra-ui/react'
import { UploadCloud, FileText } from 'lucide-react'
import type { AttachmentInput } from '@/store/ticketStore'
import { fileToAttachmentInput, formatFileSize } from '@/utils/attachmentUtils'

export interface PendingAttachment extends AttachmentInput {
  tempId: string
}

interface AttachmentUploaderProps {
  value: PendingAttachment[]
  onChange: (files: PendingAttachment[]) => void
  maxFiles?: number
  maxSizeMB?: number
}

const MAX_FILES_DEFAULT = 10
const MAX_SIZE_MB_DEFAULT = 10

export default function AttachmentUploader({
  value,
  onChange,
  maxFiles = MAX_FILES_DEFAULT,
  maxSizeMB = MAX_SIZE_MB_DEFAULT,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const remaining = maxFiles - value.length
    if (remaining <= 0) {
      toast({
        title: '已达到附件上限',
        description: `最多可上传 ${maxFiles} 个附件`,
        status: 'warning',
        duration: 2000,
      })
      return
    }

    const fileArray = Array.from(files).slice(0, remaining)
    const oversized = fileArray.filter(f => f.size > maxSizeMB * 1024 * 1024)
    if (oversized.length > 0) {
      toast({
        title: '文件过大',
        description: `单个文件不能超过 ${maxSizeMB}MB`,
        status: 'error',
        duration: 3000,
      })
      return
    }

    setIsLoading(true)
    try {
      const results = await Promise.all(fileArray.map(f => fileToAttachmentInput(f)))
      const withTempIds: PendingAttachment[] = results.map(r => ({
        ...r,
        tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      }))
      onChange([...value, ...withTempIds])
    } catch (_) {
      toast({
        title: '上传失败',
        description: '部分文件读取失败，请重试',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = (tempId: string) => {
    onChange(value.filter(f => f.tempId !== tempId))
  }

  return (
    <VStack align="stretch" spacing={3}>
      <Box
        onClick={handleClick}
        cursor="pointer"
        border="2px dashed"
        borderColor="gray.200"
        borderRadius="8px"
        p={4}
        bg="gray.50"
        _hover={{ borderColor: 'brand.400', bg: 'brand.50' }}
        transition="all 0.2s"
      >
        <VStack spacing={2}>
          <Icon as={UploadCloud} boxSize={8} color="gray.400" />
          <Text fontSize="sm" color="gray.600" fontWeight="500">
            点击或拖拽上传附件
          </Text>
          <Text fontSize="xs" color="gray.400">
            最多 {maxFiles} 个文件，单个不超过 {maxSizeMB}MB
          </Text>
        </VStack>
      </Box>

      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
        disabled={isLoading || value.length >= maxFiles}
      />

      {value.length > 0 && (
        <VStack align="stretch" spacing={2}>
          {value.map((file) => (
            <HStack
              key={file.tempId}
              p={3}
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="8px"
              spacing={3}
            >
              <Icon as={FileText} boxSize={5} color="brand.500" flexShrink={0} />
              <VStack align="stretch" spacing={0} flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="500" noOfLines={1}>
                  {file.fileName}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {formatFileSize(file.fileSize)}
                </Text>
              </VStack>
              <CloseButton
                size="sm"
                onClick={() => handleRemove(file.tempId)}
                aria-label="删除附件"
              />
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  )
}
