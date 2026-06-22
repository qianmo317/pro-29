import { describe, it, expect, beforeEach } from 'vitest'
import { useTicketStore } from '@/store/ticketStore'
import { useNotificationStore } from '@/store/notificationStore'
import type { TicketStatus } from '@/types'

const CREATOR_ID = 'u5'
const AGENT_ID = 'u2'
const ADMIN_ID = 'u1'
const DEPARTMENT_ID = 'd1'

function resetAllStores() {
  useTicketStore.setState({
    tickets: [],
    records: [],
    evaluations: [],
    attachments: [],
    comments: [],
    nextId: 1,
  })
  useNotificationStore.setState({
    followers: [],
    notifications: [],
  })
}

function getStore() {
  return useTicketStore.getState()
}

function createTicket(overrides: Partial<{
  title: string
  description: string
  category: any
  priority: any
  assigneeId: string | null
  departmentId: string | null
}> = {}) {
  const store = getStore()
  return store.addTicket({
    title: overrides.title ?? '测试工单',
    description: overrides.description ?? '这是一个测试工单的详细描述内容',
    category: overrides.category ?? 'software',
    priority: overrides.priority ?? 'medium',
    creatorId: CREATOR_ID,
    assigneeId: overrides.assigneeId ?? null,
    departmentId: overrides.departmentId ?? null,
    knowledgeId: null,
  })
}

describe('工单状态流转 - 完整链路测试', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    resetAllStores()
  })

  describe('1. 工单创建', () => {
    it('创建未分配处理人的工单，初始状态应为 pending', () => {
      const ticket = createTicket()
      expect(ticket.status).toBe('pending')
      expect(ticket.id).toBe('TK-001')
      expect(ticket.assigneeId).toBeNull()
      expect(ticket.creatorId).toBe(CREATOR_ID)
      expect(ticket.createdAt).toBeTruthy()
      expect(ticket.slaDeadline).toBeTruthy()
    })

    it('创建已分配处理人的工单，初始状态应为 assigned', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      expect(ticket.status).toBe('assigned')
      expect(ticket.assigneeId).toBe(AGENT_ID)
    })

    it('创建工单时应自动生成创建记录', () => {
      const ticket = createTicket()
      const records = getStore().getRecordsByTicketId(ticket.id)
      expect(records.length).toBeGreaterThan(0)
      expect(records[records.length - 1].action).toBe('created')
    })

    it('创建工单并指定部门', () => {
      const ticket = createTicket({ departmentId: DEPARTMENT_ID })
      expect(ticket.departmentId).toBe(DEPARTMENT_ID)
    })
  })

  describe('2. 工单分配', () => {
    it('pending 状态工单分配处理人后变为 assigned', () => {
      const ticket = createTicket()
      getStore().assignTicket(ticket.id, AGENT_ID, ADMIN_ID)
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).toBe('assigned')
      expect(updated.assigneeId).toBe(AGENT_ID)
    })

    it('分配工单应生成 assigned 记录', () => {
      const ticket = createTicket()
      getStore().assignTicket(ticket.id, AGENT_ID, ADMIN_ID)
      const records = getStore().getRecordsByTicketId(ticket.id)
      const assignRecord = records.find(r => r.action === 'assigned')
      expect(assignRecord).toBeDefined()
      expect(assignRecord!.operatorId).toBe(ADMIN_ID)
    })

    it('指派部门不改变工单状态', () => {
      const ticket = createTicket()
      getStore().assignDepartment(ticket.id, DEPARTMENT_ID, ADMIN_ID)
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).toBe('pending')
      expect(updated.departmentId).toBe(DEPARTMENT_ID)
    })
  })

  describe('3. 状态流转核心链路', () => {
    it('assigned → in_progress（开始处理）', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      expect(ticket.status).toBe('assigned')

      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理工单')
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).toBe('in_progress')
    })

    it('in_progress → waiting_confirmation（提交待确认）', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理工单')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '提交待确认')
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).toBe('waiting_confirmation')
    })

    it('waiting_confirmation → closed（确认完成）', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '提交待确认')
      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认完成')
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).toBe('closed')
    })

    it('waiting_confirmation → in_progress（驳回）', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '提交待确认')
      getStore().changeStatus(ticket.id, 'in_progress', CREATOR_ID, '驳回，需重新处理')
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).toBe('in_progress')
    })

    it('rejected → in_progress（重新处理）', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'rejected', ADMIN_ID, '方案被驳回')
      const before = getStore().getTicketById(ticket.id)!
      expect(before.status).toBe('rejected')

      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '重新处理工单')
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).toBe('in_progress')
    })

    it('状态变更应生成 status_changed 记录', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理工单')
      const records = getStore().getRecordsByTicketId(ticket.id)
      const statusRecords = records.filter(r => r.action === 'status_changed')
      expect(statusRecords.length).toBe(1)
      expect(statusRecords[0].content).toBe('开始处理工单')
    })

    it('changeStatus 无法直接将状态改为 merged', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'merged' as TicketStatus, AGENT_ID, '合并')
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.status).not.toBe('merged')
    })

    it('每次状态变更都应更新 updatedAt', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      const beforeTime = ticket.updatedAt

      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理')
      const after = getStore().getTicketById(ticket.id)!
      expect(new Date(after.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime())
    })
  })

  describe('4. 完整标准流程', () => {
    it('pending → assigned → in_progress → waiting_confirmation → closed 全链路', () => {
      const ticket = createTicket()
      expect(ticket.status).toBe('pending')

      getStore().assignTicket(ticket.id, AGENT_ID, ADMIN_ID)
      expect(getStore().getTicketById(ticket.id)!.status).toBe('assigned')

      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理')
      expect(getStore().getTicketById(ticket.id)!.status).toBe('in_progress')

      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '已修复，提交确认')
      expect(getStore().getTicketById(ticket.id)!.status).toBe('waiting_confirmation')

      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认问题已解决')
      const final = getStore().getTicketById(ticket.id)!
      expect(final.status).toBe('closed')

      const records = getStore().getRecordsByTicketId(ticket.id)
      expect(records.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('5. 工单编辑', () => {
    it('编辑工单标题、分类、优先级等字段', () => {
      const ticket = createTicket()
      getStore().editTicket(
        ticket.id,
        {
          title: '修改后的标题',
          description: '修改后的描述内容，长度足够',
          category: 'hardware',
          priority: 'high',
          tags: [],
        },
        ADMIN_ID
      )
      const updated = getStore().getTicketById(ticket.id)!
      expect(updated.title).toBe('修改后的标题')
      expect(updated.category).toBe('hardware')
      expect(updated.priority).toBe('high')
    })

    it('编辑工单应生成 edited 记录', () => {
      const ticket = createTicket()
      getStore().editTicket(
        ticket.id,
        {
          title: '新标题',
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          tags: ticket.tags ?? [],
        },
        ADMIN_ID
      )
      const records = getStore().getRecordsByTicketId(ticket.id)
      const editRecord = records.find(r => r.action === 'edited')
      expect(editRecord).toBeDefined()
    })

    it('没有实际变更时不应生成编辑记录', () => {
      const ticket = createTicket()
      const recordCountBefore = getStore().getRecordsByTicketId(ticket.id).length
      getStore().editTicket(
        ticket.id,
        {
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          tags: ticket.tags ?? [],
        },
        ADMIN_ID
      )
      const recordCountAfter = getStore().getRecordsByTicketId(ticket.id).length
      expect(recordCountAfter).toBe(recordCountBefore)
    })
  })

  describe('6. 工单备注/记录', () => {
    it('添加处理备注记录', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().addRecord(ticket.id, AGENT_ID, 'comment', '正在排查问题中')
      const records = getStore().getRecordsByTicketId(ticket.id)
      const commentRecord = records.find(r => r.action === 'comment')
      expect(commentRecord).toBeDefined()
      expect(commentRecord!.content).toBe('正在排查问题中')
    })
  })

  describe('7. 工单合并', () => {
    it('合并工单后，被合并工单状态变为 merged', () => {
      const mainTicket = createTicket({ title: '主工单' })
      const subTicket = createTicket({ title: '子工单' })

      getStore().mergeTickets(mainTicket.id, [subTicket.id], ADMIN_ID)

      const mainAfter = getStore().getTicketById(mainTicket.id)!
      const subAfter = getStore().getTicketById(subTicket.id)!
      expect(mainAfter.mergedTicketIds).toContain(subTicket.id)
      expect(subAfter.status).toBe('merged')
      expect(subAfter.mergedToId).toBe(mainTicket.id)
    })

    it('已合并的工单无法进行状态变更等操作', () => {
      const mainTicket = createTicket({ title: '主工单' })
      const subTicket = createTicket({ title: '子工单', assigneeId: AGENT_ID })

      getStore().mergeTickets(mainTicket.id, [subTicket.id], ADMIN_ID)

      const statusBefore = getStore().getTicketById(subTicket.id)!.status
      getStore().changeStatus(subTicket.id, 'in_progress', AGENT_ID, '尝试处理')
      const statusAfter = getStore().getTicketById(subTicket.id)!.status
      expect(statusAfter).toBe(statusBefore)
    })

    it('合并工单后主工单可查询到所有合并工单的记录', () => {
      const mainTicket = createTicket({ title: '主工单' })
      const subTicket = createTicket({ title: '子工单' })

      getStore().mergeTickets(mainTicket.id, [subTicket.id], ADMIN_ID)

      const mainRecords = getStore().getRecordsByTicketId(mainTicket.id)
      const subRecords = getStore().getRecordsByTicketId(subTicket.id)
      expect(mainRecords.length).toBeGreaterThanOrEqual(subRecords.length)
    })
  })

  describe('8. 工单关联', () => {
    it('添加关联工单', () => {
      const ticket1 = createTicket({ title: '工单1' })
      const ticket2 = createTicket({ title: '工单2' })

      const success = getStore().addRelatedTicket(ticket1.id, ticket2.id, ADMIN_ID)
      expect(success).toBe(true)

      const t1 = getStore().getTicketById(ticket1.id)!
      const t2 = getStore().getTicketById(ticket2.id)!
      expect(t1.relatedTicketIds).toContain(ticket2.id)
      expect(t2.relatedTicketIds).toContain(ticket1.id)
    })

    it('不能关联自己', () => {
      const ticket = createTicket()
      const success = getStore().addRelatedTicket(ticket.id, ticket.id, ADMIN_ID)
      expect(success).toBe(false)
    })

    it('取消关联工单', () => {
      const ticket1 = createTicket({ title: '工单1' })
      const ticket2 = createTicket({ title: '工单2' })

      getStore().addRelatedTicket(ticket1.id, ticket2.id, ADMIN_ID)
      getStore().removeRelatedTicket(ticket1.id, ticket2.id, ADMIN_ID)

      const t1 = getStore().getTicketById(ticket1.id)!
      const t2 = getStore().getTicketById(ticket2.id)!
      expect(t1.relatedTicketIds).not.toContain(ticket2.id)
      expect(t2.relatedTicketIds).not.toContain(ticket1.id)
    })
  })

  describe('9. 工单删除与恢复', () => {
    it('软删除工单（移入回收站）', () => {
      const ticket = createTicket()
      const success = getStore().softDeleteTicket(ticket.id, ADMIN_ID)
      expect(success).toBe(true)

      const deleted = getStore().tickets.find(t => t.id === ticket.id)!
      expect(deleted).toBeDefined()
      expect(deleted.deletedAt).toBeTruthy()
      expect(deleted.deletedBy).toBe(ADMIN_ID)

      const normalQuery = getStore().getTicketById(ticket.id)
      expect(normalQuery).toBeUndefined()

      const withDeleted = getStore().getTicketById(ticket.id, true)
      expect(withDeleted).toBeDefined()
    })

    it('从回收站恢复工单', () => {
      const ticket = createTicket()
      getStore().softDeleteTicket(ticket.id, ADMIN_ID)
      const success = getStore().restoreTicket(ticket.id, ADMIN_ID)
      expect(success).toBe(true)

      const restored = getStore().getTicketById(ticket.id)!
      expect(restored.deletedAt).toBeNull()
      expect(restored.deletedBy).toBeNull()
    })

    it('永久删除工单', () => {
      const ticket = createTicket()
      const success = getStore().permanentlyDeleteTicket(ticket.id)
      expect(success).toBe(true)
      const found = getStore().tickets.find(t => t.id === ticket.id)
      expect(found).toBeUndefined()
    })

    it('已删除工单列表查询', () => {
      createTicket({ title: '正常工单' })
      const deletedTicket = createTicket({ title: '待删除工单' })
      getStore().softDeleteTicket(deletedTicket.id, ADMIN_ID)

      const deleted = getStore().getDeletedTickets()
      expect(deleted.length).toBe(1)
      expect(deleted[0].id).toBe(deletedTicket.id)
    })
  })

  describe('10. 工单归档', () => {
    it('已关闭工单可以归档', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认完成')

      const success = getStore().archiveTicket(ticket.id, ADMIN_ID)
      expect(success).toBe(true)

      const archived = getStore().tickets.find(t => t.id === ticket.id)!
      expect(archived).toBeDefined()
      expect(archived.archivedAt).toBeTruthy()
      expect(archived.archivedBy).toBe(ADMIN_ID)
    })

    it('未关闭工单不能归档', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      const success = getStore().archiveTicket(ticket.id, ADMIN_ID)
      expect(success).toBe(false)
    })

    it('取消归档', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认完成')
      getStore().archiveTicket(ticket.id, ADMIN_ID)

      const success = getStore().unarchiveTicket(ticket.id, ADMIN_ID)
      expect(success).toBe(true)
      const restored = getStore().tickets.find(t => t.id === ticket.id)!
      expect(restored).toBeDefined()
      expect(restored.archivedAt).toBeNull()
    })

    it('已归档工单列表查询', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '开始处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认完成')
      getStore().archiveTicket(ticket.id, ADMIN_ID)

      const archived = getStore().getArchivedTickets()
      expect(archived.length).toBe(1)
    })
  })

  describe('11. 批量操作', () => {
    it('批量分配处理人', () => {
      const t1 = createTicket({ title: '工单1' })
      const t2 = createTicket({ title: '工单2' })
      const t3 = createTicket({ title: '工单3' })

      const result = getStore().batchAssignTickets([t1.id, t2.id, t3.id], AGENT_ID, ADMIN_ID)
      expect(result.success).toBe(3)
      expect(result.failed).toBe(0)

      expect(getStore().getTicketById(t1.id)!.status).toBe('assigned')
      expect(getStore().getTicketById(t2.id)!.status).toBe('assigned')
      expect(getStore().getTicketById(t3.id)!.status).toBe('assigned')
    })

    it('批量关闭工单', () => {
      const t1 = createTicket({ title: '工单1', assigneeId: AGENT_ID })
      const t2 = createTicket({ title: '工单2', assigneeId: AGENT_ID })

      getStore().changeStatus(t1.id, 'in_progress', AGENT_ID, '处理中')
      getStore().changeStatus(t2.id, 'in_progress', AGENT_ID, '处理中')

      const result = getStore().batchCloseTickets([t1.id, t2.id], ADMIN_ID, '批量关闭')
      expect(result.success).toBe(2)
      expect(getStore().getTicketById(t1.id)!.status).toBe('closed')
      expect(getStore().getTicketById(t2.id)!.status).toBe('closed')
    })

    it('批量关闭时跳过已关闭工单', () => {
      const t1 = createTicket({ title: '工单1', assigneeId: AGENT_ID })
      const t2 = createTicket({ title: '工单2', assigneeId: AGENT_ID })

      getStore().changeStatus(t1.id, 'in_progress', AGENT_ID, '处理')
      getStore().changeStatus(t1.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(t1.id, 'closed', CREATOR_ID, '已关闭')

      getStore().changeStatus(t2.id, 'in_progress', AGENT_ID, '处理中')

      const result = getStore().batchCloseTickets([t1.id, t2.id], ADMIN_ID, '批量关闭')
      expect(result.success).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.failedItems.length).toBe(1)
      expect(result.failedItems[0].reason).toContain('已关闭')
    })

    it('批量归档工单', () => {
      const t1 = createTicket({ title: '工单1', assigneeId: AGENT_ID })
      const t2 = createTicket({ title: '工单2', assigneeId: AGENT_ID })

      getStore().changeStatus(t1.id, 'in_progress', AGENT_ID, '处理')
      getStore().changeStatus(t1.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(t1.id, 'closed', CREATOR_ID, '关闭')

      getStore().changeStatus(t2.id, 'in_progress', AGENT_ID, '处理')
      getStore().changeStatus(t2.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(t2.id, 'closed', CREATOR_ID, '关闭')

      const result = getStore().batchArchiveTickets([t1.id, t2.id], ADMIN_ID)
      expect(result.success).toBe(2)
    })
  })

  describe('12. 工单评价', () => {
    it('已关闭工单可以提交评价', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认完成')

      getStore().addEvaluation(ticket.id, 5, '处理很及时', CREATOR_ID)
      const evaluation = getStore().getEvaluationByTicketId(ticket.id)
      expect(evaluation).toBeDefined()
      expect(evaluation!.rating).toBe(5)
      expect(evaluation!.comment).toBe('处理很及时')
    })

    it('同一个工单不能重复评价', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认完成')

      getStore().addEvaluation(ticket.id, 5, '评价1', CREATOR_ID)
      getStore().addEvaluation(ticket.id, 1, '评价2', CREATOR_ID)
      const evaluation = getStore().getEvaluationByTicketId(ticket.id)
      expect(evaluation!.comment).toBe('评价1')
    })

    it('评价应生成 evaluated 记录', () => {
      const ticket = createTicket({ assigneeId: AGENT_ID })
      getStore().changeStatus(ticket.id, 'in_progress', AGENT_ID, '处理')
      getStore().changeStatus(ticket.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(ticket.id, 'closed', CREATOR_ID, '确认完成')

      getStore().addEvaluation(ticket.id, 4, '不错', CREATOR_ID)
      const records = getStore().getRecordsByTicketId(ticket.id)
      const evalRecord = records.find(r => r.action === 'evaluated')
      expect(evalRecord).toBeDefined()
    })
  })

  describe('13. 统计数据', () => {
    it('工单统计数据正确', () => {
      createTicket({ title: '待分配工单' })
      createTicket({ title: '已分配工单', assigneeId: AGENT_ID })

      const inProgressTicket = createTicket({ title: '处理中工单', assigneeId: AGENT_ID })
      getStore().changeStatus(inProgressTicket.id, 'in_progress', AGENT_ID, '开始处理')

      const closedTicket = createTicket({ title: '已关闭工单', assigneeId: AGENT_ID })
      getStore().changeStatus(closedTicket.id, 'in_progress', AGENT_ID, '处理')
      getStore().changeStatus(closedTicket.id, 'waiting_confirmation', AGENT_ID, '待确认')
      getStore().changeStatus(closedTicket.id, 'closed', CREATOR_ID, '确认完成')

      const stats = getStore().getStats()
      expect(stats.totalCount).toBe(4)
      expect(stats.pendingCount).toBe(2)
      expect(stats.inProgressCount).toBe(1)
      expect(stats.closedCount).toBe(1)
    })
  })

  describe('14. 筛选查询', () => {
    it('按状态筛选工单', () => {
      createTicket({ title: '待分配1' })
      createTicket({ title: '待分配2' })
      createTicket({ title: '已分配', assigneeId: AGENT_ID })

      const pending = getStore().getFilteredTickets({ status: 'pending' })
      expect(pending.length).toBe(2)

      const assigned = getStore().getFilteredTickets({ status: 'assigned' })
      expect(assigned.length).toBe(1)
    })

    it('按优先级筛选工单', () => {
      createTicket({ title: '高优', priority: 'high' })
      createTicket({ title: '中优', priority: 'medium' })
      createTicket({ title: '紧急', priority: 'critical' })

      const critical = getStore().getFilteredTickets({ priority: 'critical' })
      expect(critical.length).toBe(1)
      expect(critical[0].priority).toBe('critical')
    })

    it('按分类筛选工单', () => {
      createTicket({ title: '网络问题', category: 'network' })
      createTicket({ title: '软件问题', category: 'software' })

      const network = getStore().getFilteredTickets({ category: 'network' })
      expect(network.length).toBe(1)
    })

    it('按搜索关键词筛选工单', () => {
      createTicket({ title: 'VPN连接问题' })
      createTicket({ title: '打印机故障' })

      const results = getStore().getFilteredTickets({ search: 'VPN' })
      expect(results.length).toBe(1)
      expect(results[0].title).toContain('VPN')
    })
  })
})
