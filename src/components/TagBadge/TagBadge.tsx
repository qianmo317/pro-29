import { Badge } from '@chakra-ui/react'
import { useTagStore } from '@/store/tagStore'

interface TagBadgeProps {
  tagId: string
  size?: 'sm' | 'md'
}

export default function TagBadge({ tagId, size = 'sm' }: TagBadgeProps) {
  const tag = useTagStore((s) => s.getTagById(tagId))
  if (!tag) return null
  return (
    <Badge
      borderRadius="6px"
      bg={`${tag.color}1A`}
      color={tag.color}
      fontSize={size === 'sm' ? 'xs' : 'sm'}
      px={2}
      py="2px"
      fontWeight="500"
    >
      {tag.name}
    </Badge>
  )
}
