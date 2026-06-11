import { Box, Card, CardBody, Heading, Text, SimpleGrid, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td, Icon } from '@chakra-ui/react'
import { TrendingUp, PieChart as PieChartIcon, Users, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useTicketStore } from '@/store/ticketStore'
import { useUserStore } from '@/store/userStore'
import type { TicketCategory, TicketRecord } from '@/types'
import { CATEGORY_LABELS } from '@/types'

const OVERVIEW_CONFIG = [
  { label: '本月新增工单', icon: TrendingUp, gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' },
  { label: '本月关闭工单', icon: Clock, gradient: 'linear-gradient(135deg, #00B894, #55EFC4)' },
  { label: '平均处理时长', icon: TrendingUp, gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)' },
  { label: 'SLA 达标率', icon: PieChartIcon, gradient: 'linear-gradient(135deg, #4839C5, #6C5CE7)' },
]

const PIE_COLORS = ['#6C5CE7', '#00B894', '#FF7675', '#FDCB6E', '#74B9FF', '#A29BFE']

function getLast7DaysData(tickets: { createdAt: string; status: string; updatedAt: string }[]) {
  const days: { date: string; created: number; closed: number }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    const created = tickets.filter(t => {
      const ct = new Date(t.createdAt)
      return ct >= dayStart && ct < dayEnd
    }).length
    const closed = tickets.filter(t => {
      if (t.status !== 'closed') return false
      const ut = new Date(t.updatedAt)
      return ut >= dayStart && ut < dayEnd
    }).length
    days.push({ date: dateStr, created, closed })
  }
  return days
}

function getCategoryData(tickets: { category: TicketCategory }[]) {
  const countMap: Record<string, number> = {}
  tickets.forEach(t => {
    const label = CATEGORY_LABELS[t.category]
    countMap[label] = (countMap[label] || 0) + 1
  })
  return Object.entries(countMap).map(([name, value]) => ({ name, value }))
}

function getAgentPerformance(
  tickets: { id: string; assigneeId: string | null; status: string; updatedAt: string; createdAt: string; slaDeadline: string }[],
  records: TicketRecord[],
  agents: { id: string; name: string }[]
) {
  return agents.map(agent => {
    const agentTickets = tickets.filter(t => t.assigneeId === agent.id)
    const total = agentTickets.length
    const resolved = agentTickets.filter(t => t.status === 'closed' || t.status === 'rejected')
    const inProgress = agentTickets.filter(t => t.status === 'in_progress')
    const pending = agentTickets.filter(t => t.status === 'pending' || t.status === 'assigned' || t.status === 'waiting_confirmation')

    let totalResponseHours = 0
    let responseCount = 0
    let totalResolutionHours = 0
    let resolutionCount = 0

    agentTickets.forEach(ticket => {
      const ticketRecords = records.filter(r => r.ticketId === ticket.id)
      const assignRecord = ticketRecords.find(r => r.action === 'assigned')
      const startRecord = ticketRecords.find(r => r.action === 'status_changed' && r.content.includes('开始处理'))

      if (assignRecord && startRecord) {
        const responseHours = (new Date(startRecord.createdAt).getTime() - new Date(assignRecord.createdAt).getTime()) / 3600000
        if (responseHours >= 0) {
          totalResponseHours += responseHours
          responseCount++
        }
      }

      if ((ticket.status === 'closed' || ticket.status === 'rejected') && assignRecord) {
        const resolutionHours = (new Date(ticket.updatedAt).getTime() - new Date(assignRecord.createdAt).getTime()) / 3600000
        if (resolutionHours >= 0) {
          totalResolutionHours += resolutionHours
          resolutionCount++
        }
      }
    })

    const avgResponseTime = responseCount > 0
      ? formatDuration(totalResponseHours / responseCount)
      : '-'
    const avgResolutionTime = resolutionCount > 0
      ? formatDuration(totalResolutionHours / resolutionCount)
      : '-'

    const onTime = resolved.filter(t => new Date(t.updatedAt) <= new Date(t.slaDeadline))
    const slaRate = resolved.length > 0 ? `${Math.round((onTime.length / resolved.length) * 100)}%` : '-'

    return {
      name: agent.name,
      total,
      resolved: resolved.length,
      inProgress: inProgress.length,
      pending: pending.length,
      avgResponseTime,
      avgResolutionTime,
      slaRate,
    }
  })
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}分钟`
  } else if (hours < 24) {
    return `${hours.toFixed(1)}小时`
  } else {
    return `${(hours / 24).toFixed(1)}天`
  }
}

const RADIAN = Math.PI / 180
function renderCustomizedLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; name: string; value: number }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#4A5568" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={13}>
      {name} ({value})
    </text>
  )
}

export default function Reports() {
  const { tickets, records, getStats } = useTicketStore()
  const { users } = useUserStore()

  const stats = getStats()
  const overviewStats = [stats.thisMonthCreated, stats.thisMonthClosed, stats.avgResolutionTime, stats.slaComplianceRate]

  const trendData = getLast7DaysData(tickets)
  const categoryData = getCategoryData(tickets)

  const agents = users.filter(u => u.role === 'agent')
  const performanceData = getAgentPerformance(tickets, records, agents)

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        报表统计
      </Heading>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5} mb={6}>
        {OVERVIEW_CONFIG.map((config, index) => (
          <Card
            key={config.label}
            bgGradient={config.gradient}
            borderRadius="16px"
            shadow="lg"
            _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
            transition="all 0.2s ease"
          >
            <CardBody py={5}>
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="3xl" fontWeight="700" color="white" lineHeight={1.2}>
                    {overviewStats[index]}
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.800" mt={1}>
                    {config.label}
                  </Text>
                </Box>
                <Icon
                  as={config.icon}
                  boxSize={10}
                  color="whiteAlpha.600"
                />
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} mb={6}>
        <Card borderRadius="16px">
          <CardBody>
            <HStack mb={4}>
              <Icon as={TrendingUp} color="brand.500" boxSize={5} />
              <Heading size="sm">工单趋势图</Heading>
            </HStack>
            <Box h={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#A0AEC0" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#A0AEC0" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="created" name="新增工单" stroke="#6C5CE7" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="closed" name="关闭工单" stroke="#00B894" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        <Card borderRadius="16px">
          <CardBody>
            <HStack mb={4}>
              <Icon as={PieChartIcon} color="brand.500" boxSize={5} />
              <Heading size="sm">分类统计图</Heading>
            </HStack>
            <Box h={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    labelLine={false}
                    label={renderCustomizedLabel}
                    dataKey="value"
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card borderRadius="16px">
        <CardBody>
          <HStack mb={4}>
            <Icon as={Users} color="brand.500" boxSize={5} />
            <Heading size="sm">处理人绩效</Heading>
          </HStack>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>处理人</Th>
                <Th isNumeric>负责工单</Th>
                <Th isNumeric>已解决</Th>
                <Th isNumeric>处理中</Th>
                <Th isNumeric>待处理</Th>
                <Th>平均响应</Th>
                <Th>平均处理</Th>
                <Th>SLA达标率</Th>
              </Tr>
            </Thead>
            <Tbody>
              {performanceData.map((row) => (
                <Tr key={row.name}>
                  <Td fontWeight="600">{row.name}</Td>
                  <Td isNumeric>{row.total}</Td>
                  <Td isNumeric>
                    <Text as="span" color="success.500" fontWeight="600">{row.resolved}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text as="span" color="brand.500" fontWeight="500">{row.inProgress}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text as="span" color="warning.500" fontWeight="500">{row.pending}</Text>
                  </Td>
                  <Td>{row.avgResponseTime}</Td>
                  <Td>{row.avgResolutionTime}</Td>
                  <Td>
                    <Text
                      as="span"
                      fontWeight="600"
                      color={row.slaRate === '-' ? 'gray.400' : row.slaRate === '100%' ? 'success.500' : 'warning.500'}
                    >
                      {row.slaRate}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  )
}
