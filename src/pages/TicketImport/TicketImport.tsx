import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Progress,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Spacer,
} from '@chakra-ui/react'
import {
  ArrowLeft,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  List,
} from 'lucide-react'
import { useTicketStore } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import { downloadTemplate, parseImportFile } from '@/utils/importUtils'
import type { ImportResult, ImportResultItem, ImportTicketRow } from '@/types'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/types'

type ImportStep = 'idle' | 'parsing' | 'importing' | 'done'

export default function TicketImport() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchImportTickets = useTicketStore((s) => s.batchImportTickets)
  const users = useUserStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)

  const [step, setStep] = useState<ImportStep>('idle')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<ImportTicketRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback(
    async (file: File) => {
      setStep('parsing')
      setFileName(file.name)
      setParseErrors([])
      setParsedRows([])

      try {
        const result = await parseImportFile(file)

        if (result.errors.length > 0 && result.rows.length === 0) {
          setParseErrors(result.errors)
          setStep('idle')
          toast({
            title: '文件解析失败',
            description: result.errors[0],
            status: 'error',
            duration: 4000,
            isClosable: true,
          })
          return
        }

        setParsedRows(result.rows)
        setParseErrors(result.errors)
        setStep('idle')

        if (result.errors.length > 0) {
          toast({
            title: '文件解析完成',
            description: `成功解析 ${result.rows.length} 条数据，有 ${result.errors.length} 条警告`,
            status: 'warning',
            duration: 3000,
            isClosable: true,
          })
        } else {
          toast({
            title: '文件解析成功',
            description: `共 ${result.rows.length} 条工单数据待导入`,
            status: 'success',
            duration: 2000,
            isClosable: true,
          })
        }
      } catch (e) {
        setStep('idle')
        toast({
          title: '文件解析失败',
          description: e instanceof Error ? e.message : '未知错误',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      }
    },
    [toast]
  )

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleStartImport = async () => {
    if (!currentUser || parsedRows.length === 0) return

    setStep('importing')
    setProgress(0)

    try {
      const result = await batchImportTickets(
        parsedRows,
        currentUser.id,
        users,
        (current, total) => {
          setProgress(Math.round((current / total) * 100))
        }
      )

      setImportResult(result)
      setStep('done')

      toast({
        title: '导入完成',
        description: `成功 ${result.success} 条，失败 ${result.failed} 条`,
        status: result.failed === 0 ? 'success' : 'warning',
        duration: 3000,
        isClosable: true,
      })
    } catch (e) {
      setStep('idle')
      toast({
        title: '导入失败',
        description: e instanceof Error ? e.message : '未知错误',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    }
  }

  const handleReset = () => {
    setStep('idle')
    setFileName('')
    setParsedRows([])
    setParseErrors([])
    setProgress(0)
    setImportResult(null)
  }

  return (
    <Box>
      <HStack mb={6} spacing={4}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')} px={2}>
          <ArrowLeft size={18} />
        </Button>
        <Heading size="lg">批量导入工单</Heading>
      </HStack>

      {step === 'done' && importResult ? (
        <ImportResultPanel result={importResult} onReset={handleReset} onBackToList={() => navigate('/tickets')} />
      ) : (
        <VStack spacing={6} align="stretch">
          <Card borderRadius="16px">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <FileSpreadsheet size={24} color="#6C5CE7" />
                  <VStack align="stretch" spacing={1}>
                    <Heading size="sm">导入模板</Heading>
                    <Text fontSize="sm" color="gray.500">
                      请先下载导入模板，按照模板格式填写工单信息后上传
                    </Text>
                  </VStack>
                  <Spacer />
                  <Button
                    leftIcon={<Download size={16} />}
                    variant="outline"
                    colorScheme="brand"
                    onClick={downloadTemplate}
                  >
                    下载模板
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          <Card
            borderRadius="16px"
            border={isDragging ? '2px dashed' : '2px solid'}
            borderColor={isDragging ? 'brand.500' : 'gray.200'}
            bg={isDragging ? 'brand.50' : 'white'}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack
                spacing={4}
                py={8}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                align="center"
                justify="center"
                minH="200px"
              >
                {step === 'parsing' || step === 'importing' ? (
                  <VStack spacing={4} w="100%" maxW="400px">
                    <Text fontSize="sm" color="gray.500">
                      {step === 'parsing' ? '正在解析文件...' : '正在导入工单...'}
                    </Text>
                    <Progress
                      value={step === 'parsing' ? undefined : progress}
                      size="lg"
                      w="100%"
                      colorScheme="brand"
                      borderRadius="full"
                      isIndeterminate={step === 'parsing'}
                    />
                    <Text fontSize="sm" color="gray.500">
                      {step === 'importing' ? `${progress}%` : '请稍候'}
                    </Text>
                  </VStack>
                ) : (
                  <>
                    <Upload size={48} color="#A29BFE" />
                    <VStack spacing={1} align="center">
                      <Text fontSize="md" fontWeight="500">
                        点击或拖拽文件到此处上传
                      </Text>
                      <Text fontSize="sm" color="gray.400">
                        支持 .xlsx、.xls、.csv 格式
                      </Text>
                    </VStack>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                    <Button
                      colorScheme="brand"
                      leftIcon={<Upload size={16} />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      选择文件
                    </Button>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>

          {fileName && parsedRows.length > 0 && step === 'idle' && (
            <Card borderRadius="16px">
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <FileSpreadsheet size={20} color="#6C5CE7" />
                    <VStack align="stretch" spacing={0}>
                      <Text fontWeight="500">{fileName}</Text>
                      <Text fontSize="sm" color="gray.500">
                        共 {parsedRows.length} 条数据待导入
                        {parseErrors.length > 0 && (
                          <Text as="span" color="orange.500" ml={2}>
                            （{parseErrors.length} 条警告）
                          </Text>
                        )}
                      </Text>
                    </VStack>
                    <Spacer />
                    <Button leftIcon={<RefreshCw size={16} />} variant="outline" onClick={handleReset}>
                      重新选择
                    </Button>
                    <Button colorScheme="brand" leftIcon={<Upload size={16} />} onClick={handleStartImport}>
                      开始导入
                    </Button>
                  </HStack>

                  {parseErrors.length > 0 && (
                    <Alert status="warning" borderRadius="12px">
                      <AlertIcon />
                      <Box flex="1">
                        <AlertTitle fontSize="sm">解析警告</AlertTitle>
                        <AlertDescription fontSize="sm">
                          以下行将被跳过，请检查数据：
                        </AlertDescription>
                        <VStack align="stretch" mt={2} spacing={1}>
                          {parseErrors.slice(0, 5).map((err, idx) => (
                            <Text key={idx} fontSize="xs" color="orange.600">
                              • {err}
                            </Text>
                          ))}
                          {parseErrors.length > 5 && (
                            <Text fontSize="xs" color="orange.600">
                              ...还有 {parseErrors.length - 5} 条警告
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    </Alert>
                  )}

                  <DataPreview rows={parsedRows} />
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      )}
    </Box>
  )
}

function DataPreview({ rows }: { rows: ImportTicketRow[] }) {
  const displayRows = rows.slice(0, 10)

  return (
    <Box>
      <HStack mb={3}>
        <List size={16} color="gray.500" />
        <Text fontSize="sm" fontWeight="500" color="gray.600">
          数据预览
          {rows.length > 10 && `（前 10 条）`}
        </Text>
      </HStack>
      <TableContainer border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
        <Table size="sm" variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>序号</Th>
              <Th>标题</Th>
              <Th>分类</Th>
              <Th>优先级</Th>
              <Th>处理人</Th>
            </Tr>
          </Thead>
          <Tbody>
            {displayRows.map((row, idx) => (
              <Tr key={idx}>
                <Td fontSize="sm">{idx + 1}</Td>
                <Td fontSize="sm" maxW="200px" isTruncated title={row.title}>
                  {row.title}
                </Td>
                <Td fontSize="sm">{CATEGORY_LABELS[row.category]}</Td>
                <Td fontSize="sm">{PRIORITY_LABELS[row.priority]}</Td>
                <Td fontSize="sm">{row.assigneeName || '未分配'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  )
}

function ImportResultPanel({
  result,
  onReset,
  onBackToList,
}: {
  result: ImportResult
  onReset: () => void
  onBackToList: () => void
}) {
  const successItems = result.items.filter((i) => i.success)
  const failedItems = result.items.filter((i) => !i.success)

  return (
    <VStack spacing={6} align="stretch">
      <Card borderRadius="16px">
        <CardBody>
          <VStack align="stretch" spacing={6}>
            <HStack>
              <Box
                w="56px"
                h="56px"
                borderRadius="50%"
                bg={result.failed === 0 ? 'green.50' : 'orange.50'}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {result.failed === 0 ? (
                  <CheckCircle size={32} color="#00B894" />
                ) : (
                  <XCircle size={32} color="#F59E0B" />
                )}
              </Box>
              <VStack align="stretch" spacing={0} flex={1}>
                <Heading size="md">
                  {result.failed === 0 ? '导入完成' : '导入完成（部分失败）'}
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  共 {result.total} 条工单，成功 {result.success} 条，失败 {result.failed} 条
                </Text>
              </VStack>
            </HStack>

            <SimpleGrid columns={3} spacing={4}>
              <StatCard label="总计" value={result.total} color="gray" icon={List} />
              <StatCard label="成功" value={result.success} color="green" icon={CheckCircle} />
              <StatCard label="失败" value={result.failed} color="red" icon={XCircle} />
            </SimpleGrid>

            <Flex justify="flex-end" gap={3}>
              <Button variant="outline" onClick={onReset}>
                继续导入
              </Button>
              <Button colorScheme="brand" onClick={onBackToList}>
                返回工单列表
              </Button>
            </Flex>
          </VStack>
        </CardBody>
      </Card>

      <Card borderRadius="16px">
        <CardBody p={0}>
          <Tabs variant="enclosed">
            <TabList px={4} pt={4}>
              <Tab>
                <HStack spacing={2}>
                  <CheckCircle size={16} color="#00B894" />
                  <Text>成功 ({successItems.length})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <XCircle size={16} color="#E53E3E" />
                  <Text>失败 ({failedItems.length})</Text>
                </HStack>
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={4}>
                <SuccessTable items={successItems} />
              </TabPanel>
              <TabPanel p={4}>
                <FailedTable items={failedItems} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </VStack>
  )
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string
  value: number
  color: string
  icon: React.ComponentType<{ size?: number; color?: string }>
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    gray: { bg: 'gray.50', text: 'gray.600' },
    green: { bg: 'green.50', text: 'green.600' },
    red: { bg: 'red.50', text: 'red.600' },
  }
  const colors = colorMap[color] || colorMap.gray

  return (
    <Card bg={colors.bg} borderRadius="12px">
      <CardBody py={4}>
        <HStack spacing={3}>
          <Icon size={24} color={colors.text} />
          <VStack align="stretch" spacing={0}>
            <Text fontSize="2xl" fontWeight="700" color={colors.text}>
              {value}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {label}
            </Text>
          </VStack>
        </HStack>
      </CardBody>
    </Card>
  )
}

function SuccessTable({ items }: { items: ImportResultItem[] }) {
  if (items.length === 0) {
    return (
      <Text textAlign="center" py={8} color="gray.400">
        暂无成功数据
      </Text>
    )
  }

  return (
    <TableContainer>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>行号</Th>
            <Th>工单编号</Th>
            <Th>标题</Th>
            <Th>分类</Th>
            <Th>优先级</Th>
            <Th>状态</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item) => (
            <Tr key={item.rowIndex}>
              <Td fontSize="sm">{item.rowIndex}</Td>
              <Td fontSize="sm" fontWeight="600" color="brand.600">
                {item.ticket?.id}
              </Td>
              <Td fontSize="sm" maxW="200px" isTruncated title={item.data.title}>
                {item.data.title}
              </Td>
              <Td fontSize="sm">{CATEGORY_LABELS[item.data.category]}</Td>
              <Td fontSize="sm">{PRIORITY_LABELS[item.data.priority]}</Td>
              <Td>
                <Badge colorScheme="green" variant="subtle">
                  成功
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}

function FailedTable({ items }: { items: ImportResultItem[] }) {
  if (items.length === 0) {
    return (
      <Text textAlign="center" py={8} color="gray.400">
        暂无失败数据
      </Text>
    )
  }

  return (
    <TableContainer>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>行号</Th>
            <Th>标题</Th>
            <Th>分类</Th>
            <Th>优先级</Th>
            <Th>失败原因</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item) => (
            <Tr key={item.rowIndex}>
              <Td fontSize="sm">{item.rowIndex}</Td>
              <Td fontSize="sm" maxW="200px" isTruncated title={item.data.title}>
                {item.data.title || '-'}
              </Td>
              <Td fontSize="sm">{CATEGORY_LABELS[item.data.category] || '-'}</Td>
              <Td fontSize="sm">{PRIORITY_LABELS[item.data.priority] || '-'}</Td>
              <Td fontSize="sm" color="red.500">
                {item.error}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}

function SimpleGrid({
  columns,
  spacing,
  children,
}: {
  columns: number
  spacing: number
  children: React.ReactNode
}) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(${columns}, 1fr)`}
      gap={spacing}
    >
      {children}
    </Box>
  )
}
