import { useState } from 'react'
import {
  Flex,
  Card,
  CardBody,
  Heading,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  VStack,
  HStack,
  Icon,
  Tag,
  Divider,
  SimpleGrid,
} from '@chakra-ui/react'
import { Ticket, Mail, Lock, LogIn, Shield, UserCog, User } from 'lucide-react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useUserStore } from '@/store/userStore'

const ROLE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  admin: { label: '管理员', icon: Shield, color: 'purple' },
  agent: { label: '处理人员', icon: UserCog, color: 'blue' },
  submitter: { label: '普通用户', icon: User, color: 'green' },
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, users } = useUserStore()

  const [email, setEmail] = useState('admin@company.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      const result = login(email.trim(), password)
      setLoading(false)
      if (result.success) {
        const from = (location.state as any)?.from?.pathname || '/dashboard'
        navigate(from, { replace: true })
      } else {
        setError(result.message)
      }
    }, 500)
  }

  const quickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail)
    setPassword(userPassword)
  }

  return (
    <Flex
      h="100vh"
      w="100vw"
      align="center"
      justify="center"
      bgGradient="linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6C5CE7 100%)"
      overflow="hidden"
      p={4}
    >
      <Flex
        w="100%"
        maxW="1000px"
        maxH="92vh"
        gap={5}
        direction={{ base: 'column', lg: 'row' }}
      >
        <Card
          flex={1}
          borderRadius="20px"
          shadow="2xl"
          display={{ base: 'none', lg: 'flex' }}
          overflow="hidden"
        >
          <CardBody
            p={8}
            bgGradient="linear-gradient(135deg, #6C5CE7, #A29BFE)"
            h="100%"
            display="flex"
            flexDirection="column"
            justifyContent="center"
          >
            <VStack spacing={5} align="stretch">
              <HStack spacing={3}>
                <Flex
                  bg="whiteAlpha.200"
                  p={2.5}
                  borderRadius="14px"
                  backdropFilter="blur(10px)"
                >
                  <Icon as={Ticket} size={24} color="white" />
                </Flex>
                <VStack align="start" spacing={0}>
                  <Heading size="lg" color="white">工单管理系统</Heading>
                  <Text color="whiteAlpha.800" fontSize="sm">Ticket Management System</Text>
                </VStack>
              </HStack>

              <VStack align="stretch" spacing={3} mt={4}>
                <Text color="whiteAlpha.900" fontSize="md" fontWeight="500">
                  高效、专业的 IT 服务管理平台
                </Text>
                <Text color="whiteAlpha.70" lineHeight={1.7} fontSize="sm">
                  支持工单全生命周期管理、智能 SLA 监控、知识库沉淀、数据统计分析，
                  帮助团队快速响应和解决用户问题。
                </Text>
              </VStack>

              <VStack align="stretch" spacing={2.5} mt={4}>
                <HStack spacing={2.5}>
                  <Flex w="7px" h="7px" borderRadius="full" bg="white" />
                  <Text color="whiteAlpha.80" fontSize="sm">工单全流程追踪</Text>
                </HStack>
                <HStack spacing={2.5}>
                  <Flex w="7px" h="7px" borderRadius="full" bg="white" />
                  <Text color="whiteAlpha.80" fontSize="sm">SLA 智能时效告警</Text>
                </HStack>
                <HStack spacing={2.5}>
                  <Flex w="7px" h="7px" borderRadius="full" bg="white" />
                  <Text color="whiteAlpha.80" fontSize="sm">知识库经验沉淀</Text>
                </HStack>
                <HStack spacing={2.5}>
                  <Flex w="7px" h="7px" borderRadius="full" bg="white" />
                  <Text color="whiteAlpha.80" fontSize="sm">数据可视化报表</Text>
                </HStack>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        <Card flex={1} borderRadius="20px" shadow="2xl" overflow="hidden">
          <CardBody p={{ base: 5, md: 7 }} h="100%" display="flex" flexDirection="column">
            <VStack spacing={4} align="stretch" flex={1} overflow="auto" css={{ scrollbarWidth: 'none' }}>
              <VStack spacing={1.5} align="start">
                <HStack spacing={2.5} display={{ base: 'flex', lg: 'none' }}>
                  <Flex
                    bgGradient="linear-gradient(135deg, #6C5CE7, #A29BFE)"
                    p={2}
                    borderRadius="10px"
                  >
                    <Icon as={Ticket} size={20} color="white" />
                  </Flex>
                  <Heading size="sm">工单管理系统</Heading>
                </HStack>
                <Heading size="md">欢迎登录 👋</Heading>
                <Text color="gray.500" fontSize="sm">请输入您的账号信息以继续</Text>
              </VStack>

              {error && (
                <Alert status="error" borderRadius="10px" py={2}>
                  <AlertIcon boxSize={4} />
                  <Text fontSize="sm">{error}</Text>
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <VStack spacing={3} align="stretch">
                  <FormControl isRequired>
                    <FormLabel fontSize="sm" mb={1.5}>邮箱</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入邮箱"
                      borderRadius="10px"
                      size="md"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm" mb={1.5}>密码</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      borderRadius="10px"
                      size="md"
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    size="md"
                    h="42px"
                    borderRadius="10px"
                    bgGradient="linear-gradient(135deg, #6C5CE7, #A29BFE)"
                    color="white"
                    _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }}
                    transition="all 0.2s"
                    isLoading={loading}
                    loadingText="登录中..."
                    leftIcon={<Icon as={LogIn} size={16} />}
                    mt={1}
                  >
                    登录
                  </Button>
                </VStack>
              </form>

              <Divider />

              <VStack spacing={2} align="stretch" flexShrink={0}>
                <Text fontSize="xs" color="gray.500" fontWeight="500">
                  快速登录测试账号：
                </Text>
                <SimpleGrid columns={2} spacing={2}>
                  {users.slice(0, 4).map((user) => {
                    const roleInfo = ROLE_LABELS[user.role]
                    return (
                      <HStack
                        key={user.id}
                        p={2}
                        bg="gray.50"
                        borderRadius="10px"
                        _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                        onClick={() => quickLogin(user.email, user.password)}
                        transition="all 0.15s"
                        spacing={2}
                      >
                        <Flex
                          w="28px"
                          h="28px"
                          borderRadius="8px"
                          bgGradient={`linear-gradient(135deg, ${roleInfo.color}.400, ${roleInfo.color}.600)`}
                          align="center"
                          justify="center"
                          flexShrink={0}
                        >
                          <Icon as={roleInfo.icon} color="white" size={14} />
                        </Flex>
                        <VStack spacing={0} align="start" minW={0} flex={1}>
                          <Text fontWeight="600" fontSize="xs" noOfLines={1}>{user.name}</Text>
                          <Tag colorScheme={roleInfo.color} size="xs" variant="subtle" py={0} lineHeight={1}>
                            {roleInfo.label}
                          </Tag>
                        </VStack>
                      </HStack>
                    )
                  })}
                </SimpleGrid>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </Flex>
    </Flex>
  )
}
