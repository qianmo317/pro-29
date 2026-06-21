import { useLocation, useNavigate } from 'react-router-dom'
import { Box, VStack, HStack, Text, Icon } from '@chakra-ui/react'
import { LayoutDashboard, TicketCheck, BookOpen, BarChart3, User, FileText, CalendarClock, Megaphone } from 'lucide-react'
import { useUserStore } from '@/store/userStore'

const NAV_ITEMS = [
  { label: '仪表盘', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'agent', 'submitter'] },
  { label: '工单管理', icon: TicketCheck, path: '/tickets', roles: ['admin', 'agent', 'submitter'] },
  { label: '预约工单', icon: CalendarClock, path: '/scheduled-tickets', roles: ['admin', 'agent', 'submitter'] },
  { label: '公告管理', icon: Megaphone, path: '/announcements', roles: ['admin'] },
  { label: '模板管理', icon: FileText, path: '/templates', roles: ['admin'] },
  { label: '知识库', icon: BookOpen, path: '/knowledge', roles: ['admin', 'agent', 'submitter'] },
  { label: '报表统计', icon: BarChart3, path: '/reports', roles: ['admin', 'agent', 'submitter'] },
]

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  agent: '技术员',
  submitter: '提交人',
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#6C5CE7',
  agent: '#00B894',
  submitter: '#74B9FF',
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useUserStore((s) => s.currentUser)

  if (!currentUser) return null

  return (
    <Box
      w="240px"
      h="100vh"
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
      display="flex"
      flexDirection="column"
      py={6}
      px={4}
      flexShrink={0}
    >
      <VStack spacing={1} mb={8}>
        <Text
          fontSize="2xl"
          fontWeight="800"
          bgGradient="linear(to-r, #6C5CE7, #A29BFE)"
          bgClip="text"
        >
          TMS
        </Text>
        <Text fontSize="xs" color="gray.500">
          工单管理系统
        </Text>
      </VStack>

      <VStack spacing={2} flex={1}>
        {NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role)).map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <HStack
              key={item.path}
              w="100%"
              px={4}
              py={3}
              borderRadius="12px"
              cursor="pointer"
              bg={isActive ? '#6C5CE7' : 'transparent'}
              color={isActive ? 'white' : 'gray.600'}
              _hover={!isActive ? { bg: 'gray.100' } : undefined}
              onClick={() => navigate(item.path)}
              spacing={3}
              transition="all 0.2s"
            >
              <Icon as={item.icon} boxSize={5} />
              <Text fontSize="sm" fontWeight={isActive ? '600' : '500'}>
                {item.label}
              </Text>
            </HStack>
          )
        })}
      </VStack>

      <Box
        borderTop="1px solid"
        borderColor="gray.200"
        pt={4}
        px={2}
      >
        <HStack spacing={3}>
          <Box
            w={9}
            h={9}
            borderRadius="50%"
            bgGradient={`linear-gradient(135deg, ${ROLE_COLORS[currentUser.role]}, ${ROLE_COLORS[currentUser.role]}aa)`}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <User size={16} color="white" />
          </Box>
          <VStack spacing={0} align="flex-start" flex={1}>
            <Text fontSize="sm" fontWeight="600" noOfLines={1}>
              {currentUser.name}
            </Text>
            <Text
              fontSize="xs"
              fontWeight="500"
              color="white"
              bg={ROLE_COLORS[currentUser.role]}
              px={1.5}
              py={0}
              borderRadius="6px"
              lineHeight="18px"
            >
              {ROLE_LABELS[currentUser.role]}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </Box>
  )
}
