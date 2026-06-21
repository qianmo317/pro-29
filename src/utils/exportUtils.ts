import * as XLSX from 'xlsx'
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from '@/types'
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/types'
import html2canvas from 'html2canvas'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((w) => ({ wch: w }))
}

export interface ExportTicketOptions {
  tickets: Ticket[]
  users: { id: string; name: string }[]
  departments: { id: string; name: string }[]
  tags: { id: string; name: string }[]
  filters?: {
    status?: TicketStatus
    priority?: TicketPriority
    category?: TicketCategory
    departmentId?: string
    search?: string
  }
}

export function exportTicketsToExcel(options: ExportTicketOptions) {
  const { tickets, users, departments, tags, filters } = options

  const getUserName = (id: string | null) => {
    if (!id) return '未分配'
    const user = users.find((u) => u.id === id)
    return user ? user.name : '未分配'
  }

  const getDeptName = (id: string | null) => {
    if (!id) return '未分配'
    const dept = departments.find((d) => d.id === id)
    return dept ? dept.name : '未分配'
  }

  const getTagName = (id: string) => {
    const tag = tags.find((t) => t.id === id)
    return tag ? tag.name : id
  }

  const now = new Date()
  const exportTime = formatDateTime(now.toISOString())

  const summaryData: (string | number)[][] = [
    ['工单列表导出报告'],
    ['导出时间', exportTime],
    ['导出数量', tickets.length],
    [],
    ['筛选条件'],
    ['状态', filters?.status ? STATUS_LABELS[filters.status] : '全部'],
    ['优先级', filters?.priority ? PRIORITY_LABELS[filters.priority] : '全部'],
    ['分类', filters?.category ? CATEGORY_LABELS[filters.category] : '全部'],
    ['部门', filters?.departmentId ? getDeptName(filters.departmentId) : '全部'],
    ['搜索关键词', filters?.search || '无'],
    [],
  ]

  const headers = [
    '编号',
    '标题',
    '描述',
    '分类',
    '标签',
    '优先级',
    '状态',
    '所属部门',
    '负责人（处理人）',
    '创建时间',
    'SLA截止时间',
    '更新时间',
    '数据量（字数）',
  ]

  const ticketRows = tickets.map((ticket) => {
    const tagNames = (ticket.tags ?? []).map(getTagName).join('、')
    const descriptionLength = ticket.description?.length || 0
    return [
      ticket.id,
      ticket.title,
      ticket.description,
      CATEGORY_LABELS[ticket.category],
      tagNames || '无',
      PRIORITY_LABELS[ticket.priority],
      STATUS_LABELS[ticket.status],
      getDeptName(ticket.departmentId),
      getUserName(ticket.assigneeId),
      formatDateTime(ticket.createdAt),
      formatDateTime(ticket.slaDeadline),
      formatDateTime(ticket.updatedAt),
      descriptionLength,
    ]
  })

  const allData = [...summaryData, headers, ...ticketRows]

  const ws = XLSX.utils.aoa_to_sheet(allData)
  setColumnWidths(ws, [12, 30, 50, 10, 20, 8, 10, 15, 15, 20, 20, 20, 12])

  const summaryEndRow = summaryData.length
  const headerRow = summaryEndRow
  ws['!autofilter'] = { ref: `A${headerRow + 1}:M${headerRow + 1 + tickets.length}` }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '工单列表')

  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  downloadWorkbook(wb, `工单列表_${timestamp}.xlsx`)
}

export interface ChartScreenshotResult {
  name: string
  dataUrl: string
}

export async function captureChartScreenshots(
  chartSelectors: { key: string; selector: string; name: string }[]
): Promise<ChartScreenshotResult[]> {
  const results: ChartScreenshotResult[] = []

  for (const { key, selector, name } of chartSelectors) {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        })
        const dataUrl = canvas.toDataURL('image/png')
        results.push({ name: key, dataUrl })
      } catch (e) {
        console.error(`Failed to capture ${name}:`, e)
      }
    }
  }

  return results
}

export interface ReportExportData {
  overview: {
    label: string
    value: string | number
  }[]
  trendData: { date: string; created: number; closed: number }[]
  categoryData: { name: string; value: number }[]
  departmentChartData: { name: string; 总工单: number; 已解决: number; 处理中: number; 待处理: number }[]
  departmentPieData: { name: string; value: number }[]
  departmentStats: Array<{
    departmentName: string
    totalCount: number
    closedCount: number
    inProgressCount: number
    pendingCount: number
    avgResponseTime: string
    avgResolutionTime: string
    slaComplianceRate: string
  }>
  performanceData: Array<{
    name: string
    total: number
    resolved: number
    inProgress: number
    pending: number
    avgResponseTime: string
    avgResolutionTime: string
    slaRate: string
    avgRating?: string
    ratingCount?: number
  }>
  evaluationSummary: {
    totalEvaluations: number
    overallAvgRating: string
    ratedAgents: number
  }
  ratingChartData: { name: string; 评分: number; count: number }[]
  ratingBreakdown: Array<{
    name: string
    averageRating: number
    count: number
    distribution: Record<number, number>
  }>
}

export async function exportReportsToExcel(
  data: ReportExportData,
  chartScreenshots?: ChartScreenshotResult[]
) {
  const now = new Date()
  const exportTime = formatDateTime(now.toISOString())
  const wb = XLSX.utils.book_new()

  const summarySheet: (string | number)[][] = [
    ['统计报表导出报告'],
    ['导出时间', exportTime],
    [],
    ['概览统计'],
    ['指标', '数值'],
    ...data.overview.map((item) => [item.label, item.value]),
    [],
    ['评价汇总'],
    ['总评价数', data.evaluationSummary.totalEvaluations],
    ['平均满意度', data.evaluationSummary.overallAvgRating],
    ['参评处理人数', data.evaluationSummary.ratedAgents],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet)
  setColumnWidths(wsSummary, [25, 20])
  XLSX.utils.book_append_sheet(wb, wsSummary, '概览')

  const trendHeaders = ['日期', '新增工单', '关闭工单']
  const trendRows = data.trendData.map((d) => [d.date, d.created, d.closed])
  const trendSheet = [trendHeaders, ...trendRows]
  const wsTrend = XLSX.utils.aoa_to_sheet(trendSheet)
  setColumnWidths(wsTrend, [15, 12, 12])
  wsTrend['!autofilter'] = { ref: `A1:C${1 + trendRows.length}` }
  XLSX.utils.book_append_sheet(wb, wsTrend, '趋势数据')

  const categoryHeaders = ['分类', '工单数量']
  const categoryRows = data.categoryData.map((d) => [d.name, d.value])
  const categorySheet = [categoryHeaders, ...categoryRows]
  const wsCategory = XLSX.utils.aoa_to_sheet(categorySheet)
  setColumnWidths(wsCategory, [15, 12])
  wsCategory['!autofilter'] = { ref: `A1:B${1 + categoryRows.length}` }
  XLSX.utils.book_append_sheet(wb, wsCategory, '分类数据')

  const deptChartHeaders = ['部门', '总工单', '已解决', '处理中', '待处理']
  const deptChartRows = data.departmentChartData.map((d) => [
    d.name,
    d.总工单,
    d.已解决,
    d.处理中,
    d.待处理,
  ])
  const deptChartSheet = [deptChartHeaders, ...deptChartRows]
  const wsDeptChart = XLSX.utils.aoa_to_sheet(deptChartSheet)
  setColumnWidths(wsDeptChart, [15, 10, 10, 10, 10])
  wsDeptChart['!autofilter'] = { ref: `A1:E${1 + deptChartRows.length}` }
  XLSX.utils.book_append_sheet(wb, wsDeptChart, '部门工单量')

  const deptStatsHeaders = [
    '部门',
    '总工单',
    '已解决',
    '处理中',
    '待处理',
    '平均响应时间',
    '平均处理时间',
    'SLA达标率',
  ]
  const deptStatsRows = data.departmentStats.map((d) => [
    d.departmentName,
    d.totalCount,
    d.closedCount,
    d.inProgressCount,
    d.pendingCount,
    d.avgResponseTime,
    d.avgResolutionTime,
    d.slaComplianceRate,
  ])
  const deptStatsSheet = [deptStatsHeaders, ...deptStatsRows]
  const wsDeptStats = XLSX.utils.aoa_to_sheet(deptStatsSheet)
  setColumnWidths(wsDeptStats, [15, 10, 10, 10, 10, 15, 15, 12])
  wsDeptStats['!autofilter'] = { ref: `A1:H${1 + deptStatsRows.length}` }
  XLSX.utils.book_append_sheet(wb, wsDeptStats, '部门效率')

  const perfHeaders = [
    '处理人',
    '负责工单',
    '已解决',
    '处理中',
    '待处理',
    '平均响应',
    '平均处理',
    'SLA达标率',
    '平均评价',
    '评价数',
  ]
  const perfRows = data.performanceData.map((d) => [
    d.name,
    d.total,
    d.resolved,
    d.inProgress,
    d.pending,
    d.avgResponseTime,
    d.avgResolutionTime,
    d.slaRate,
    d.avgRating || '-',
    d.ratingCount || 0,
  ])
  const perfSheet = [perfHeaders, ...perfRows]
  const wsPerf = XLSX.utils.aoa_to_sheet(perfSheet)
  setColumnWidths(wsPerf, [12, 10, 10, 10, 10, 12, 12, 12, 10, 10])
  wsPerf['!autofilter'] = { ref: `A1:J${1 + perfRows.length}` }
  XLSX.utils.book_append_sheet(wb, wsPerf, '处理人绩效')

  const ratingHeaders = ['处理人', '平均评分', '评价数量']
  const ratingRows = data.ratingChartData.map((d) => [d.name, d.评分, d.count])
  const ratingSheet = [ratingHeaders, ...ratingRows]
  const wsRating = XLSX.utils.aoa_to_sheet(ratingSheet)
  setColumnWidths(wsRating, [15, 10, 10])
  wsRating['!autofilter'] = { ref: `A1:C${1 + ratingRows.length}` }
  XLSX.utils.book_append_sheet(wb, wsRating, '评价数据')

  const breakdownHeaders = ['处理人', '平均评分', '评价数', '1星', '2星', '3星', '4星', '5星']
  const breakdownRows = data.ratingBreakdown.map((d) => [
    d.name,
    d.averageRating.toFixed(1),
    d.count,
    d.distribution[1] || 0,
    d.distribution[2] || 0,
    d.distribution[3] || 0,
    d.distribution[4] || 0,
    d.distribution[5] || 0,
  ])
  const breakdownSheet = [breakdownHeaders, ...breakdownRows]
  const wsBreakdown = XLSX.utils.aoa_to_sheet(breakdownSheet)
  setColumnWidths(wsBreakdown, [15, 10, 10, 8, 8, 8, 8, 8])
  wsBreakdown['!autofilter'] = { ref: `A1:H${1 + breakdownRows.length}` }
  XLSX.utils.book_append_sheet(wb, wsBreakdown, '评分分布')

  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  downloadWorkbook(wb, `统计报表_${timestamp}.xlsx`)

  if (chartScreenshots && chartScreenshots.length > 0) {
    downloadChartImages(chartScreenshots, timestamp)
  }
}

function downloadChartImages(screenshots: ChartScreenshotResult[], timestamp: string) {
  screenshots.forEach((shot, index) => {
    const link = document.createElement('a')
    link.href = shot.dataUrl
    link.download = `图表_${index + 1}_${shot.name}_${timestamp}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  })
}
