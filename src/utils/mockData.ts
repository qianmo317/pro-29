import type { User, Ticket, TicketRecord, TicketEvaluation, KnowledgeArticle, SLAConfig, TicketTemplate, Department } from '@/types'

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: '网络组', description: '负责网络基础设施、VPN、WiFi等', color: '#3182CE' },
  { id: 'd2', name: '硬件组', description: '负责办公设备、电脑、打印机等硬件运维', color: '#E53E3E' },
  { id: 'd3', name: '安全组', description: '负责信息安全、防火墙、权限管理等', color: '#D69E2E' },
  { id: 'd4', name: '软件组', description: '负责软件系统、邮件、OA等应用运维', color: '#805AD5' },
]

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '张管理', role: 'admin', avatar: '', email: 'admin@company.com', password: 'admin123', departmentId: null },
  { id: 'u2', name: '李技术', role: 'agent', avatar: '', email: 'li@company.com', password: 'agent123', departmentId: 'd1' },
  { id: 'u3', name: '王运维', role: 'agent', avatar: '', email: 'wang@company.com', password: 'agent123', departmentId: 'd2' },
  { id: 'u4', name: '赵开发', role: 'agent', avatar: '', email: 'zhao@company.com', password: 'agent123', departmentId: 'd4' },
  { id: 'u7', name: '钱安全', role: 'agent', avatar: '', email: 'qian@company.com', password: 'agent123', departmentId: 'd3' },
  { id: 'u8', name: '吴网络', role: 'agent', avatar: '', email: 'wu@company.com', password: 'agent123', departmentId: 'd1' },
  { id: 'u5', name: '孙提交', role: 'submitter', avatar: '', email: 'sun@company.com', password: 'user123', departmentId: null },
  { id: 'u6', name: '周用户', role: 'submitter', avatar: '', email: 'zhou@company.com', password: 'user123', departmentId: null },
]

const now = new Date()
const h = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString()
const f = (hours: number) => new Date(now.getTime() + hours * 3600000).toISOString()

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'TK-001', title: 'VPN 连接频繁断开', description: '最近一周 VPN 连接每隔 2-3 小时会自动断开，影响远程办公效率。已尝试重新安装客户端但问题依旧。',
    category: 'network', priority: 'high', status: 'in_progress', creatorId: 'u5',
    assigneeId: 'u2', departmentId: 'd1', createdAt: h(72), updatedAt: h(4), slaDeadline: f(2), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-002', title: '新员工账号权限申请', description: '新入职员工陈明需要开通 CRM 系统、邮件系统和 VPN 的访问权限，部门为市场部。',
    category: 'access', priority: 'medium', status: 'assigned', creatorId: 'u6',
    assigneeId: 'u7', departmentId: 'd3', createdAt: h(48), updatedAt: h(12), slaDeadline: f(6), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-003', title: '办公电脑蓝屏故障', description: '财务部 3 台电脑在运行 SAP 系统时频繁蓝屏，错误代码：CRITICAL_PROCESS_DIED。',
    category: 'hardware', priority: 'critical', status: 'pending', creatorId: 'u5',
    assigneeId: null, departmentId: 'd2', createdAt: h(6), updatedAt: h(6), slaDeadline: h(-2), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-004', title: '邮件服务器响应缓慢', description: '近两天邮件收发延迟严重，平均延迟超过 30 分钟，部分紧急邮件无法及时送达。',
    category: 'software', priority: 'high', status: 'in_progress', creatorId: 'u6',
    assigneeId: 'u4', departmentId: 'd4', createdAt: h(36), updatedAt: h(2), slaDeadline: h(-1), knowledgeId: 'k1',
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-005', title: '防火墙规则更新请求', description: '因业务需要，需开放端口 8443 供新上线的外部 API 服务使用，目标 IP：10.0.1.100。',
    category: 'security', priority: 'medium', status: 'waiting_confirmation', creatorId: 'u5',
    assigneeId: 'u7', departmentId: 'd3', createdAt: h(96), updatedAt: h(8), slaDeadline: f(12), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-006', title: '打印机驱动兼容性问题', description: '升级 Windows 11 后，HP LaserJet Pro M404n 打印机无法正常工作，驱动安装失败。',
    category: 'hardware', priority: 'low', status: 'closed', creatorId: 'u6',
    assigneeId: 'u3', departmentId: 'd2', createdAt: h(168), updatedAt: h(24), slaDeadline: h(24), knowledgeId: 'k2',
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-007', title: '内部 wiki 系统无法登录', description: 'Confluence 系统登录时提示认证失败，但密码确认无误，已尝试清除缓存和换浏览器。',
    category: 'software', priority: 'medium', status: 'in_progress', creatorId: 'u5',
    assigneeId: 'u4', departmentId: 'd4', createdAt: h(24), updatedAt: h(1), slaDeadline: f(8), knowledgeId: 'k3',
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-008', title: 'WiFi 信号覆盖不足', description: '3 楼东侧会议室 WiFi 信号极弱，视频会议时频繁卡顿，影响客户演示。',
    category: 'network', priority: 'medium', status: 'assigned', creatorId: 'u6',
    assigneeId: 'u8', departmentId: 'd1', createdAt: h(18), updatedAt: h(6), slaDeadline: f(18), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-009', title: '数据备份异常告警', description: '备份系统发出异常告警，最近一次完整备份失败，需尽快排查原因并恢复备份任务。',
    category: 'other', priority: 'critical', status: 'in_progress', creatorId: 'u5',
    assigneeId: 'u3', departmentId: 'd2', createdAt: h(3), updatedAt: h(1), slaDeadline: f(1), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-010', title: 'SSL 证书即将过期', description: '公司官网 SSL 证书将于 7 天后过期，需要续签并更新服务器配置。',
    category: 'security', priority: 'high', status: 'pending', creatorId: 'u6',
    assigneeId: null, departmentId: 'd3', createdAt: h(1), updatedAt: h(1), slaDeadline: f(5), knowledgeId: 'k4',
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-011', title: 'OA 系统流程审批异常', description: '报销审批流程在部门经理审批节点后卡住，无法流转到下一环节。',
    category: 'software', priority: 'high', status: 'rejected', creatorId: 'u5',
    assigneeId: 'u4', departmentId: 'd4', createdAt: h(120), updatedAt: h(48), slaDeadline: h(24), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
  {
    id: 'TK-012', title: '新办公区域网络布线', description: '5 楼新装修区域需要网络布线，共计 20 个工位和 2 个会议室。',
    category: 'network', priority: 'low', status: 'closed', creatorId: 'u6',
    assigneeId: 'u2', departmentId: 'd1', createdAt: h(336), updatedAt: h(72), slaDeadline: h(72), knowledgeId: null,
    mergedToId: null, mergedTicketIds: [],
  },
]

export const MOCK_RECORDS: TicketRecord[] = [
  { id: 'r1', ticketId: 'TK-001', operatorId: 'u5', action: 'created', content: '创建工单', createdAt: h(72) },
  { id: 'r2', ticketId: 'TK-001', operatorId: 'u1', action: 'assigned', content: '将工单分配给李技术', createdAt: h(70) },
  { id: 'r3', ticketId: 'TK-001', operatorId: 'u2', action: 'status_changed', content: '开始处理，已排查 VPN 服务器日志，发现内存泄漏问题', createdAt: h(48) },
  { id: 'r4', ticketId: 'TK-001', operatorId: 'u2', action: 'comment', content: '已联系 VPN 厂商技术支持，等待补丁发布', createdAt: h(4) },
  { id: 'r5', ticketId: 'TK-002', operatorId: 'u6', action: 'created', content: '创建工单', createdAt: h(48) },
  { id: 'r6', ticketId: 'TK-002', operatorId: 'u1', action: 'assigned', content: '将工单分配给王运维', createdAt: h(47) },
  { id: 'r7', ticketId: 'TK-003', operatorId: 'u5', action: 'created', content: '创建工单 - 紧急！财务部无法正常工作', createdAt: h(6) },
  { id: 'r8', ticketId: 'TK-004', operatorId: 'u6', action: 'created', content: '创建工单', createdAt: h(36) },
  { id: 'r9', ticketId: 'TK-004', operatorId: 'u1', action: 'assigned', content: '将工单分配给赵开发', createdAt: h(35) },
  { id: 'r10', ticketId: 'TK-004', operatorId: 'u4', action: 'status_changed', content: '开始排查邮件服务器，发现队列堵塞', createdAt: h(20) },
  { id: 'r11', ticketId: 'TK-004', operatorId: 'u4', action: 'comment', content: '正在清理邮件队列，预计 2 小时内恢复', createdAt: h(2) },
  { id: 'r12', ticketId: 'TK-005', operatorId: 'u5', action: 'created', content: '创建工单', createdAt: h(96) },
  { id: 'r13', ticketId: 'TK-005', operatorId: 'u1', action: 'assigned', content: '将工单分配给李技术', createdAt: h(95) },
  { id: 'r14', ticketId: 'TK-005', operatorId: 'u2', action: 'status_changed', content: '已配置防火墙规则，等待确认', createdAt: h(12) },
  { id: 'r15', ticketId: 'TK-005', operatorId: 'u2', action: 'status_changed', content: '设置状态为待确认', createdAt: h(8) },
  { id: 'r16', ticketId: 'TK-006', operatorId: 'u6', action: 'created', content: '创建工单', createdAt: h(168) },
  { id: 'r17', ticketId: 'TK-006', operatorId: 'u3', action: 'status_changed', content: '安装兼容驱动程序，测试打印正常', createdAt: h(48) },
  { id: 'r18', ticketId: 'TK-006', operatorId: 'u6', action: 'confirmed', content: '确认问题已解决', createdAt: h(24) },
  { id: 'r19', ticketId: 'TK-007', operatorId: 'u5', action: 'created', content: '创建工单', createdAt: h(24) },
  { id: 'r20', ticketId: 'TK-007', operatorId: 'u4', action: 'status_changed', content: '开始排查 LDAP 认证服务', createdAt: h(3) },
  { id: 'r21', ticketId: 'TK-009', operatorId: 'u5', action: 'created', content: '创建工单 - 备份失败需紧急处理', createdAt: h(3) },
  { id: 'r22', ticketId: 'TK-009', operatorId: 'u1', action: 'assigned', content: '将工单分配给王运维', createdAt: h(2.5) },
  { id: 'r23', ticketId: 'TK-009', operatorId: 'u3', action: 'status_changed', content: '开始排查，检查备份服务器存储空间', createdAt: h(1) },
  { id: 'r24', ticketId: 'TK-010', operatorId: 'u6', action: 'created', content: '创建工单', createdAt: h(1) },
  { id: 'r25', ticketId: 'TK-011', operatorId: 'u5', action: 'created', content: '创建工单', createdAt: h(120) },
  { id: 'r26', ticketId: 'TK-011', operatorId: 'u4', action: 'comment', content: '修复方案被驳回，需要重新设计方案', createdAt: h(48) },
  { id: 'r27', ticketId: 'TK-006', operatorId: 'u6', action: 'evaluated', content: '提交评价：5 星，处理很及时，驱动安装后打印恢复正常', createdAt: h(20) },
  { id: 'r28', ticketId: 'TK-012', operatorId: 'u6', action: 'evaluated', content: '提交评价：3 星，布线完成但整体耗时偏长', createdAt: h(70) },
]

export const MOCK_EVALUATIONS: TicketEvaluation[] = [
  {
    id: 'ev1', ticketId: 'TK-006', rating: 5, comment: '处理很及时，驱动安装后打印恢复正常，态度也很好。',
    evaluatorId: 'u6', assigneeId: 'u3', createdAt: h(20),
  },
  {
    id: 'ev2', ticketId: 'TK-012', rating: 3, comment: '布线最终完成了，但整体耗时偏长，希望后续能提高效率。',
    evaluatorId: 'u6', assigneeId: 'u2', createdAt: h(70),
  },
]

const k1Content = [
  '## 邮件服务器维护指南',
  '',
  '### 常见问题',
  '',
  '1. **队列堵塞**',
  '   - 检查 mailq 命令输出',
  '   - 使用 postsuper -d ALL 清理堵塞邮件',
  '   - 检查磁盘空间是否充足',
  '',
  '2. **认证失败**',
  '   - 确认 LDAP 服务正常运行',
  '   - 检查 SASL 认证配置',
  '   - 查看日志 /var/log/maillog',
  '',
  '3. **性能优化**',
  '   - 调整 maxproc 参数',
  '   - 启用连接缓存',
  '   - 定期清理旧邮件',
].join('\n')

const k2Content = [
  '## Windows 11 打印机驱动兼容性解决方案',
  '',
  '### 问题描述',
  '升级 Windows 11 后，部分打印机驱动不兼容。',
  '',
  '### 解决步骤',
  '',
  '1. 卸载现有驱动',
  '2. 下载厂商 Windows 11 专用驱动',
  '3. 以管理员身份安装',
  '4. 重启打印服务 spooler',
  '5. 测试打印',
  '',
  '### 常见品牌驱动下载',
  '- HP: support.hp.com',
  '- Canon: usa.canon.com/support',
  '- Epson: epson.com/support',
].join('\n')

const k3Content = [
  '## Confluence 登录故障排查',
  '',
  '### 排查步骤',
  '',
  '1. **检查 LDAP 连接** - 运行 ldapsearch 验证连接',
  '',
  '2. **查看应用日志** - 检查 atlassian-confluence.log 日志文件',
  '',
  '3. **重启服务** - 执行 systemctl restart confluence',
  '',
  '4. **清除缓存** - 进入管理后台，缓存管理，清除所有缓存',
].join('\n')

const k4Content = [
  '## SSL 证书更新操作手册',
  '',
  '### 证书续签流程',
  '',
  '1. **生成 CSR** - 使用 openssl 生成新的证书签名请求',
  '',
  '2. **提交 CA 签发** - 登录 CA 平台，提交 CSR 文件，完成 DNS 验证',
  '',
  '3. **安装证书** - 将证书文件复制到 /etc/ssl/certs/ 和 /etc/ssl/private/',
  '',
  '4. **重启 Web 服务** - 执行 nginx -s reload',
  '',
  '5. **验证证书** - 浏览器访问检查锁图标，使用 SSL Labs 在线检测',
].join('\n')

const k5Content = [
  '## VPN 常见连接问题及解决方法',
  '',
  '### 连接频繁断开',
  '',
  '1. 检查网络稳定性',
  '2. 更新 VPN 客户端版本',
  '3. 修改 MTU 设置为 1400',
  '4. 检查服务器端会话超时配置',
  '',
  '### 无法连接',
  '',
  '1. 确认 VPN 服务器地址正确',
  '2. 检查防火墙是否放行',
  '3. 尝试切换协议（IKEv2/OpenVPN/L2TP）',
  '4. 查看客户端日志排查错误',
  '',
  '### 速度慢',
  '',
  '1. 切换更近的服务器节点',
  '2. 修改加密方式为较轻量算法',
  '3. 检查本地网络带宽',
].join('\n')

const k6Content = [
  '## 新员工 IT 权限开通标准流程',
  '',
  '### 需开通权限清单',
  '',
  '1. **基础权限**',
  '   - 域账号（AD）',
  '   - 邮箱账号',
  '   - WiFi 账号',
  '',
  '2. **办公系统**',
  '   - OA 系统',
  '   - 考勤系统',
  '   - 内部 Wiki',
  '',
  '3. **按部门开通**',
  '   - 研发部：GitLab、Jenkins、VPN',
  '   - 市场部：CRM、邮件组',
  '   - 财务部：SAP、财务系统',
  '',
  '### 流程',
  '1. HR 提交入职通知',
  '2. IT 管理员创建账号',
  '3. 申请人确认开通',
  '4. 归档记录',
].join('\n')

export const MOCK_KNOWLEDGE: KnowledgeArticle[] = [
  {
    id: 'k1', title: '邮件服务器维护指南', category: 'software',
    content: k1Content,
    tags: ['邮件', '服务器', '维护'], authorId: 'u4', createdAt: h(720), updatedAt: h(240), relatedTicketId: null,
  },
  {
    id: 'k2', title: 'Windows 11 打印机驱动兼容性解决方案', category: 'hardware',
    content: k2Content,
    tags: ['打印机', '驱动', 'Windows 11'], authorId: 'u3', createdAt: h(480), updatedAt: h(72), relatedTicketId: 'TK-006',
  },
  {
    id: 'k3', title: 'Confluence 登录故障排查', category: 'software',
    content: k3Content,
    tags: ['Confluence', '登录', 'LDAP'], authorId: 'u4', createdAt: h(360), updatedAt: h(120), relatedTicketId: 'TK-007',
  },
  {
    id: 'k4', title: 'SSL 证书更新操作手册', category: 'security',
    content: k4Content,
    tags: ['SSL', '证书', '安全'], authorId: 'u2', createdAt: h(600), updatedAt: h(180), relatedTicketId: 'TK-010',
  },
  {
    id: 'k5', title: 'VPN 常见连接问题及解决方法', category: 'network',
    content: k5Content,
    tags: ['VPN', '网络', '连接'], authorId: 'u2', createdAt: h(240), updatedAt: h(24), relatedTicketId: 'TK-001',
  },
  {
    id: 'k6', title: '新员工 IT 权限开通标准流程', category: 'access',
    content: k6Content,
    tags: ['权限', '新员工', '流程'], authorId: 'u1', createdAt: h(840), updatedAt: h(360), relatedTicketId: 'TK-002',
  },
]

export const MOCK_SLA_CONFIGS: SLAConfig[] = [
  { id: 'sla1', category: 'all', priority: 'critical', responseHours: 0.5, resolutionHours: 4 },
  { id: 'sla2', category: 'all', priority: 'high', responseHours: 2, resolutionHours: 8 },
  { id: 'sla3', category: 'all', priority: 'medium', responseHours: 4, resolutionHours: 24 },
  { id: 'sla4', category: 'all', priority: 'low', responseHours: 8, resolutionHours: 48 },
]

export const MOCK_TEMPLATES: TicketTemplate[] = [
  {
    id: 'tpl-001',
    name: '新员工入职权限申请',
    description: '新员工入职时统一使用的权限申请模板',
    category: 'access',
    priority: 'medium',
    title: '新员工【姓名】入职权限申请',
    descriptionContent:
`员工姓名：
员工工号：
所属部门：
入职日期：

需要开通的权限：
□ 域账号（AD）
□ 邮箱账号
□ WiFi账号
□ OA系统
□ 考勤系统
□ 内部Wiki
□ CRM系统
□ VPN
□ GitLab
□ Jenkins
□ SAP
□ 其他：________

部门负责人审批：

备注：`,
    isActive: true,
    createdAt: h(720),
    updatedAt: h(720),
    creatorId: 'u1',
  },
  {
    id: 'tpl-002',
    name: '设备报修申请',
    description: '办公设备故障报修使用',
    category: 'hardware',
    priority: 'medium',
    title: '【设备类型】故障报修 - 【位置】',
    descriptionContent:
`设备类型：
□ 台式电脑
□ 笔记本电脑
□ 打印机
□ 显示器
□ 键盘/鼠标
□ 电话
□ 其他：________

设备编号（如有）：
所在位置：
使用人：

故障现象描述：

是否紧急：
□ 是（影响正常工作）
□ 否（可正常使用）

期望处理时间：

备注：`,
    isActive: true,
    createdAt: h(600),
    updatedAt: h(600),
    creatorId: 'u1',
  },
  {
    id: 'tpl-003',
    name: '网络问题反馈',
    description: '网络连接、WiFi、VPN等问题',
    category: 'network',
    priority: 'medium',
    title: '网络问题反馈 - 【问题类型】',
    descriptionContent:
`问题类型：
□ WiFi无法连接
□ WiFi信号弱
□ 有线网络不通
□ VPN无法连接
□ VPN频繁断开
□ 网络速度慢
□ 特定网站无法访问
□ 其他：________

发生位置：
涉及设备数量：

问题描述：

开始时间：
是否可以复现：
□ 每次都出现
□ 偶尔出现
□ 特定时间出现

已尝试的解决方法：

备注：`,
    isActive: true,
    createdAt: h(480),
    updatedAt: h(480),
    creatorId: 'u1',
  },
  {
    id: 'tpl-004',
    name: '软件安装/使用问题',
    description: '软件安装、配置、使用相关问题',
    category: 'software',
    priority: 'low',
    title: '【软件名称】安装/使用问题',
    descriptionContent:
`软件名称：
软件版本（如有）：

问题类型：
□ 需要申请安装
□ 安装失败
□ 启动异常
□ 功能使用问题
□ 许可证激活
□ 其他：________

操作系统：
□ Windows 10
□ Windows 11
□ macOS
□ Linux
□ 其他：________

问题描述：

错误截图（如有请附上）：

已尝试的解决方法：

备注：`,
    isActive: true,
    createdAt: h(360),
    updatedAt: h(360),
    creatorId: 'u1',
  },
  {
    id: 'tpl-005',
    name: '安全事件报告',
    description: '安全漏洞、异常访问、数据泄露等安全事件',
    category: 'security',
    priority: 'high',
    title: '【紧急】安全事件报告 - 【事件类型】',
    descriptionContent:
`事件类型：
□ 账号被盗
□ 异常登录
□ 钓鱼邮件
□ 数据泄露
□ 系统漏洞
□ 恶意软件
□ 其他安全事件：________

发生时间：
影响范围：

事件描述：

涉及系统/数据：

已采取的措施：

是否需要紧急处理：
□ 是（需要立即响应）
□ 否（可按正常流程处理）

联系人及电话：

备注：`,
    isActive: true,
    createdAt: h(240),
    updatedAt: h(120),
    creatorId: 'u1',
  },
]
