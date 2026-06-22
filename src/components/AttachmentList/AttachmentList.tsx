import {
  VStack,
  HStack,
  Text,
  Icon,
  Button,
} from '@chakra-ui/react'
import { FileText, Download } from 'lucide-react'
import type { Attachment } from '@/types'
import { formatFileSize } from '@/utils/attachmentUtils'
import { useTicketStore } from '@/store/ticketStore'

interface AttachmentListProps {
  attachments: Attachment[]
  title?: string
}

export default function AttachmentList({ attachments, title }: AttachmentListProps) {
  const downloadAttachment = useTicketStore((s) => s.downloadAttachment)

  if (attachments.length === 0) return null

  const handleDownload = (att: Attachment) => {
    downloadAttachment(att.id)
  }

  return (
    <VStack align="stretch" spacing={2} mt={3}>
      {title && (
        <Text fontSize="xs" color="gray.500" fontWeight="500">
          {title}（{attachments.length}）
        </Text>
      )}
      <VStack align="stretch" spacing={1}>
        {attachments.map((att) => (
          <HStack
            key={att.id}
            p={2}
            px={3}
            bg="gray.50"
            borderRadius="6px"
            spacing={3}
            _hover={{ bg: 'brand.50' }}
            transition="background 0.15s"
          >
            <Icon as={FileText} boxSize={4} color="brand.500" flexShrink={0} />
            <VStack align="stretch" spacing={0} flex={1} minW={0}>
              <Text fontSize="xs" fontWeight="500" noOfLines={1}>
                {att.fileName}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {formatFileSize(att.fileSize)}
              </Text>
            </VStack>
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<Icon as={Download} boxSize={3} />}
              onClick={() => handleDownload(att)}
              colorScheme="brand"
            >
              下载
            </Button>
          </HStack>
        ))}
      </VStack>
    </VStack>
  )
}
