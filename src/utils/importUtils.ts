import * as XLSX from 'xlsx'
import type { ImportTicketRow, TicketCategory, TicketPriority } from '@/types'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/types'

const CATEGORY_LABEL_TO_VALUE: Record<string, TicketCategory> = {
  '网络': 'network',
  '硬件': 'hardware',
  '软件': 'software',
  '安全': 'security',
  '权限': 'access',
  '其他': 'other',
  network: 'network',
  hardware: 'hardware',
  software: 'software',
  security: 'security',
  access: 'access',
  other: 'other',
}

const PRIORITY_LABEL_TO_VALUE: Record<string, TicketPriority> = {
  '紧急': 'critical',
  '高': 'high',
  '中': 'medium',
  '低': 'low',
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

export function generateTemplateFile(): Blob {
  const headers = ['标题', '描述', '分类', '优先级', '处理人']
  const sampleRow = [
    '无法连接公司网络',
    '电脑无法连接到公司内部网络，尝试重启路由器后问题依旧，请协助排查。',
    '网络',
    '高',
    '张技术',
  ]
  const categoryHint = ['', '', `可选值：${Object.values(CATEGORY_LABELS).join('、')}`, '', '']
  const priorityHint = ['', '', '', `可选值：${Object.values(PRIORITY_LABELS).join('、')}`, '']

  const data = [headers, sampleRow, categoryHint, priorityHint]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const colWidths = [
    { wch: 30 },
    { wch: 50 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
  ]
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '工单导入模板')

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadTemplate() {
  const blob = generateTemplateFile()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '工单导入模板.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface ParseResult {
  rows: ImportTicketRow[]
  errors: string[]
}

export async function parseImportFile(file: File): Promise<ParseResult> {
  const errors: string[] = []

  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  const isCSV = file.name.endsWith('.csv')

  if (!isExcel && !isCSV) {
    return { rows: [], errors: ['仅支持 .xlsx、.xls 和 .csv 格式的文件'] }
  }

  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })

    if (jsonData.length < 2) {
      return { rows: [], errors: ['文件内容为空或格式不正确'] }
    }

    const headers = (jsonData[0] as string[]).map((h) => String(h || '').trim())

    const titleIndex = headers.findIndex((h) => h === '标题' || h === 'title')
    const descIndex = headers.findIndex((h) => h === '描述' || h === 'description')
    const categoryIndex = headers.findIndex((h) => h === '分类' || h === 'category')
    const priorityIndex = headers.findIndex((h) => h === '优先级' || h === 'priority')
    const assigneeIndex = headers.findIndex(
      (h) => h === '处理人' || h === 'assignee' || h === 'assigneeName'
    )

    if (titleIndex === -1) errors.push('缺少必填列：标题')
    if (descIndex === -1) errors.push('缺少必填列：描述')
    if (categoryIndex === -1) errors.push('缺少必填列：分类')
    if (priorityIndex === -1) errors.push('缺少必填列：优先级')

    if (errors.length > 0) {
      return { rows: [], errors }
    }

    const rows: ImportTicketRow[] = []

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as string[]
      const title = String(row[titleIndex] || '').trim()
      const description = String(row[descIndex] || '').trim()
      const categoryRaw = String(row[categoryIndex] || '').trim()
      const priorityRaw = String(row[priorityIndex] || '').trim()
      const assigneeName = assigneeIndex >= 0 ? String(row[assigneeIndex] || '').trim() : ''

      if (!title && !description && !categoryRaw && !priorityRaw) {
        continue
      }

      const category = CATEGORY_LABEL_TO_VALUE[categoryRaw]
      if (!category) {
        errors.push(`第 ${i + 1} 行：分类 "${categoryRaw}" 无效`)
        continue
      }

      const priority = PRIORITY_LABEL_TO_VALUE[priorityRaw]
      if (!priority) {
        errors.push(`第 ${i + 1} 行：优先级 "${priorityRaw}" 无效`)
        continue
      }

      rows.push({
        title,
        description,
        category,
        priority,
        assigneeName: assigneeName || undefined,
      })
    }

    if (rows.length === 0 && errors.length === 0) {
      errors.push('未找到有效的工单数据')
    }

    return { rows, errors }
  } catch (e) {
    return {
      rows: [],
      errors: [`文件解析失败：${e instanceof Error ? e.message : '未知错误'}`],
    }
  }
}
