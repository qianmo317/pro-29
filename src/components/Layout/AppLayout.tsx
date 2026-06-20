import { useLocation, useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import {
  Flex,
  Box,
  HStack,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  VStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Tag,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import { LogOut, User, Shield, UserCog, Bell } from 'lucide-react'
import Sidebar from './Sidebar'
import { useUserStore } from '@/store/userStore'
import { useNotificationStore } from '@/store/notificationStore'
import NotificationPanel from '@/components/NotificationPanel/NotificationPanel'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/tickets': '工单管理',
  '/tickets/create': '创建工单',
  '/knowledge': '知识库',
  '/reports': '报表统计',
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: '管理员', color: 'purple' },
  agent: { label: '处理人员', color: 'blue' },
  submitter: { label: '普通用户', color: 'green' },
}

function getRouteLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  if (pathname.startsWith('/tickets/')) return '工单详情'
  if (pathname.startsWith('/knowledge/')) return '文章详情'
  return '页面'
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useUserStore((s) => s.currentUser)
  const logout = useUserStore((s) => s.logout)
  const getUnreadCountByUserId = useNotificationStore((s) => s.getUnreadCountByUserId)

  const currentLabel = getRouteLabel(location.pathname)
  const unreadCount = currentUser ? getUnreadCountByUserId(currentUser.id) : 0

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (!currentUser) return null

  const roleInfo = ROLE_LABELS[currentUser.role]

  return (
    <Flex h="100vh" w="100vw" overflow="hidden">
      <Sidebar />

      <Flex direction="column" flex={1} overflow="hidden">
        <Box
          h="64px"
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          px={6}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexShrink={0}
        >
          <Breadcrumb separator={<ChevronRightIcon color="gray.400" fontSize="sm" />}>
            <BreadcrumbItem>
              <BreadcrumbLink fontSize="sm" color="gray.500">
                首页
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text fontSize="sm" fontWeight="600" color="gray.700">
                {currentLabel}
              </Text>
            </BreadcrumbItem>
          </Breadcrumb>

          <HStack spacing={2}>
            <Menu placement="bottom-end">
              <MenuButton
                as={IconButton}
                variant="ghost"
                borderRadius="12px"
                position="relative"
                aria-label="消息通知"
                _hover={{ bg: 'gray.100' }}
              >
                <Box position="relative">
                  <Bell size={20} color="#4A5568" />
                  {unreadCount > 0 && (
                    <Box
                      position="absolute"
                      top="-6px"
                      right="-8px"
                      minW="16px"
                      h="16px"
                      borderRadius="full"
                      bg="#E53E3E"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      px="4px"
                    >
                      <Text
                        fontSize="10px"
                        fontWeight="700"
                        color="white"
                        lineHeight={1}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </Box>
                  )}
                </Box>
              </MenuButton>
              <NotificationPanel />
            </Menu>

            <Menu placement="bottom-end">
            <MenuButton
              as={IconButton}
              variant="ghost"
              borderRadius="12px"
              _hover={{ bg: 'gray.100' }}
            >
              <HStack spacing={3}>
                <HStack spacing={2} align="start">
                  <VStack spacing={0} align="end">
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                      {currentUser.name}
                    </Text>
                    <Tag size="xs" colorScheme={roleInfo.color} variant="subtle">
                      {roleInfo.label}
                    </Tag>
                  </VStack>
                </HStack>
                <Box
                  w={9}
                  h={9}
                  borderRadius="50%"
                  bgGradient={`linear-gradient(135deg, ${roleInfo.color}.400, ${roleInfo.color}.600)`}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <User size={16} color="white" />
                </Box>
              </HStack>
            </MenuButton>
            <MenuList borderRadius="12px" p={2} minW="200px">
              <MenuItem
                icon={<User size={16} />}
                borderRadius="8px"
                isDisabled
              >
                <VStack spacing={0} align="start" py={1}>
                  <Text fontSize="sm" fontWeight="600">{currentUser.name}</Text>
                  <Text fontSize="xs" color="gray.500">{currentUser.email}</Text>
                </VStack>
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<Shield size={16} />}
                borderRadius="8px"
                isDisabled
              >
                <HStack spacing={2}>
                  <Text fontSize="sm">角色权限</Text>
                  <Tag size="xs" colorScheme={roleInfo.color} variant="subtle">
                    {roleInfo.label}
                  </Tag>
                </HStack>
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<LogOut size={16} />}
                borderRadius="8px"
                onClick={handleLogout}
                color="red.500"
                _hover={{ bg: 'red.50' }}
              >
                <Text fontSize="sm" fontWeight="500">退出登录</Text>
              </MenuItem>
            </MenuList>
          </Menu>
          </HStack>
        </Box>

        <Box flex={1} overflow="auto" p={6} bg="#F7F8FC">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
