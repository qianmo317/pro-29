import { useState } from 'react'
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Badge,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react'
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import { useSLAStore } from '@/store/slaStore'
import { useUserStore } from '@/store/userStore'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/types'
import type { TicketPriority } from '@/types'
import { Navigate } from 'react-router-dom'
import { useRef } from 'react'

interface SLAFormData {
  responseHours: number
  resolutionHours: number
}

export default function SLAManage() {
  const currentUser = useUserStore((s) => s.currentUser)
  const configs = useSLAStore((s) => s.configs)
  const updateConfig = useSLAStore((s) => s.updateConfig)
  const resetToDefaults = useSLAStore((s) => s.resetToDefaults)
  const toast = useToast()

  const { isOpen: isResetOpen, onOpen: openReset, onClose: closeReset } = useDisclosure()
  const cancelResetRef = useRef<HTMLButtonElement>(null)

  const [formData, setFormData] = useState<Record<TicketPriority, SLAFormData>>(
    () => {
      const initial: Record<string, SLAFormData> = {}
      configs.forEach((config) => {
        initial[config.priority] = {
          responseHours: config.responseHours,
          resolutionHours: config.resolutionHours,
        }
      })
      return initial as Record<TicketPriority, SLAFormData>
    }
  )

  const [hasChanges, setHasChanges] = useState(false)

  if (!currentUser) return null

  if (currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const priorities: TicketPriority[] = ['critical', 'high', 'medium', 'low']

  const handleInputChange = (
    priority: TicketPriority,
    field: keyof SLAFormData,
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [priority]: {
        ...prev[priority],
        [field]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    try {
      priorities.forEach((priority) => {
        const { responseHours, resolutionHours } = formData[priority]
        updateConfig(priority, responseHours, resolutionHours)
      })
      setHasChanges(false)
      toast({
        title: 'SLA 配置已保存',
        description: '新配置将立即应用于新创建的工单',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (e) {
      toast({
        title: '保存失败',
        description: e instanceof Error ? e.message : '未知错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleReset = () => {
    resetToDefaults()
    const resetData: Record<string, SLAFormData> = {}
    useSLAStore.getState().configs.forEach((config) => {
      resetData[config.priority] = {
        responseHours: config.responseHours,
        resolutionHours: config.resolutionHours,
      }
    })
    setFormData(resetData as Record<TicketPriority, SLAFormData>)
    setHasChanges(false)
    closeReset()
    toast({
      title: '已恢复默认配置',
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }

  const formatHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} 分钟`
    }
    if (hours < 24) {
      return `${hours} 小时`
    }
    return `${(hours / 24).toFixed(1)} 天`
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <HStack spacing={4}>
          <Clock size={24} color="#6C5CE7" />
          <Heading size="lg">SLA 配置管理</Heading>
        </HStack>
        <HStack spacing={3}>
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
            onClick={openReset}
          >
            恢复默认
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSave}
            isDisabled={!hasChanges}
          >
            保存配置
          </Button>
        </HStack>
      </HStack>

      <Text color="gray.500" mb={6} fontSize="sm">
        按优先级自定义工单的响应时间和解决时间。配置保存后立即生效，
        <Text as="span" fontWeight="500" color="orange.500">
          已有的工单将按照创建时的规则计算，新创建的工单将使用新规则。
        </Text>
      </Text>

      <Card mb={6}>
        <CardBody p={6}>
          <VStack align="flex-start" spacing={3}>
            <HStack spacing={2}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text fontSize="sm" color="gray.600">
                <Text as="span" fontWeight="600">响应时间</Text>：从工单创建到首次响应的目标时间
              </Text>
            </HStack>
            <HStack spacing={2}>
              <AlertTriangle size={18} color="#00B894" />
              <Text fontSize="sm" color="gray.600">
                <Text as="span" fontWeight="600">解决时间</Text>：从工单创建到最终解决的目标时间
              </Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardBody p={0}>
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th w="20%">优先级</Th>
                <Th w="35%">响应时间目标</Th>
                <Th w="35%">解决时间目标</Th>
                <Th w="10%">预览</Th>
              </Tr>
            </Thead>
            <Tbody>
              {priorities.map((priority) => (
                <Tr key={priority} _hover={{ bg: 'gray.50' }}>
                  <Td>
                    <Badge
                      color="white"
                      bg={PRIORITY_COLORS[priority]}
                      variant="solid"
                      px={3}
                      py={1}
                      borderRadius="6px"
                    >
                      {PRIORITY_LABELS[priority]}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <NumberInput
                        value={formData[priority].responseHours}
                        onChange={(valueString, valueNumber) =>
                          handleInputChange(priority, 'responseHours', valueNumber)
                        }
                        min={0}
                        step={0.5}
                        precision={1}
                        w="120px"
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Text fontSize="sm" color="gray.500">
                        小时（{formatHours(formData[priority].responseHours)}）
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <NumberInput
                        value={formData[priority].resolutionHours}
                        onChange={(valueString, valueNumber) =>
                          handleInputChange(priority, 'resolutionHours', valueNumber)
                        }
                        min={0}
                        step={0.5}
                        precision={1}
                        w="120px"
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Text fontSize="sm" color="gray.500">
                        小时（{formatHours(formData[priority].resolutionHours)}）
                      </Text>
                    </HStack>
                  </Td>
                  <Td fontSize="sm" color="gray.500">
                    <VStack align="flex-start" spacing={1}>
                      <Text>响应: {formatHours(formData[priority].responseHours)}</Text>
                      <Text>解决: {formatHours(formData[priority].resolutionHours)}</Text>
                    </VStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <AlertDialog
        isOpen={isResetOpen}
        leastDestructiveRef={cancelResetRef}
        onClose={closeReset}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              恢复默认配置
            </AlertDialogHeader>

            <AlertDialogBody>
              确定要将所有 SLA 配置恢复为系统默认值吗？此操作不可撤销。
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelResetRef} variant="ghost" onClick={closeReset}>
                取消
              </Button>
              <Button colorScheme="orange" onClick={handleReset} ml={3}>
                确认恢复
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}
