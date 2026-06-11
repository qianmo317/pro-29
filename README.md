# 工单管理系统 (Ticket Management System)

一套面向企业 IT 运维和客户服务团队的全流程工单管理平台，实现工单从创建、分配、处理到关闭的全生命周期管理。

## 技术栈

- **React 18** + **TypeScript** - 前端框架
- **Vite** - 构建工具
- **Chakra UI 2** - UI 组件库
- **React Router v6** - 路由管理
- **Zustand** - 状态管理
- **Recharts** - 图表可视化
- **Lucide React** - 图标库

## 核心功能

### 工单全生命周期管理
- 创建工单 → 分配处理人 → 处理中 → 待确认 → 已关闭
- 支持驳回重新处理、重新分配
- 工单筛选、搜索、排序、分页

### SLA 超时告警
- 根据优先级自动计算 SLA 截止时间
- 实时倒计时显示（环形进度条）
- 超时脉冲动画告警
- 仪表盘集中展示超时/即将超时工单

### 处理记录时间线
- 所有操作自动记录
- 垂直时间线可视化展示
- 区分创建、分配、状态变更、备注等操作类型

### 知识库
- 知识文章管理
- 分类筛选和关键词搜索
- 创建工单时智能推荐相关知识文章
- 关联工单和知识文章

### 报表统计
- 工单趋势折线图（近7天）
- 分类统计饼图
- 处理人绩效排名
- SLA 达标率统计

## 项目结构

```
src/
├── components/          # 通用组件
│   ├── Layout/          # 布局（侧边栏、顶栏）
│   ├── StatusBadge/     # 状态标签
│   ├── Timeline/        # 处理记录时间线
│   └── SLAIndicator/    # SLA 倒计时指示器
├── pages/               # 页面组件
│   ├── Dashboard/       # 仪表盘
│   ├── TicketList/      # 工单列表
│   ├── TicketDetail/    # 工单详情
│   ├── TicketCreate/    # 创建工单
│   ├── Knowledge/       # 知识库
│   └── Reports/         # 报表统计
├── store/               # Zustand 状态管理
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数（Mock 数据、SLA 计算、存储）
├── theme/               # Chakra UI 自定义主题
├── App.tsx              # 路由配置
└── main.tsx             # 应用入口
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# TypeScript 类型检查
npm run check
```

## 页面路由

| 路由 | 页面 |
|------|------|
| `/dashboard` | 仪表盘 |
| `/tickets` | 工单列表 |
| `/tickets/create` | 创建工单 |
| `/tickets/:id` | 工单详情 |
| `/knowledge` | 知识库 |
| `/knowledge/:id` | 文章详情 |
| `/reports` | 报表统计 |

## 数据说明

本项目为纯前端应用，使用 Mock 数据模拟后端接口，数据通过 LocalStorage 持久化。内置了：

- 12 条示例工单（覆盖所有状态和优先级）
- 26 条处理记录
- 6 篇知识文章
- 6 个用户（1 管理员 + 3 处理人 + 2 提交人）
- 4 级 SLA 配置
