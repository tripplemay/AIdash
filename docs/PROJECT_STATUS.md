# AI Dash 教师授课系统 — 项目进度总览

> 最后更新：2026-03-14

---

## 当前阶段

**阶段一：纯 HTML 原型落地** ✅ 已完成
**阶段二：迁移至 Next.js 框架** ✅ 已完成 — 全部 6 个 Phase 已完成并验收通过
**阶段三：文档符合性修复** ✅ 已完成

---

## Todolist

### 阶段一：纯 HTML 原型落地

| # | 任务 | 状态 | 方案文档 | 备注 |
|---|------|------|----------|------|
| 1.1 | 读取交接包，输出项目理解报告 | ✅ 已完成 | — | 含页面结构、冻结约束、接入规范理解 |
| 1.2 | 创建项目目录结构 | ✅ 已完成 | — | 含 assets/、course-packages/ |
| 1.3 | 登录页（index.html） | ✅ 已完成 | — | 左侧品牌 + 右侧登录卡，含企业微信/微信预留 |
| 1.4 | 课程包列表页（list.html） | ✅ 已完成 | — | 紧凑侧栏 200px + 3列卡片，样板课真实内容 |
| 1.5 | 课程包详情页（detail.html） | ✅ 已完成 | — | 已确认主图 + 元信息 + 进入本课按钮 |
| 1.6 | 管理员后台页（admin.html） | ✅ 已完成 | — | 元信息表单 + 附件绑定 |
| 1.7 | 还原单课原型 HTML | ✅ 已完成 | — | 从 CocoaHTMLWriter 实体格式还原为可运行 HTML |
| 1.8 | 按接入规范 v1 创建课程包目录结构 | ✅ 已完成 | [接入规范 v1](../CLAUDE交接包/source_refs/teacher-pack-content-integration-spec-v1.md) | 含 lesson.json、package.json、attachments/ |
| 1.9 | 全局样式体系（assets/style.css） | ✅ 已完成 | — | 浅蓝紫雾光科技感 CSS 变量体系 |

---

### 阶段二：迁移至 Next.js 框架

| # | 任务 | 状态 | 方案文档 | 备注 |
|---|------|------|----------|------|
| 2.0 | 技术选型讨论与确认 | ✅ 已完成 | [ADR-001](decisions/ADR-001-nextjs-migration.md) | Next.js + Tailwind + Prisma + 腾讯云 TDSQL-C |
| 2.1 | 制定完整迁移实现方案 | ✅ 已完成 | [迁移方案](tech/architecture/nextjs-migration-plan.md) | 6个Phase，已确认 |
| **Phase 1** | **项目初始化与基础配置** | ✅ 已完成 | — | — |
| 2.2 | create-next-app 初始化项目 | ✅ 已完成 | — | TypeScript + Tailwind + App Router |
| 2.3 | CSS 变量映射进 Tailwind 主题 | ✅ 已完成 | — | globals.css @theme inline |
| 2.4 | 全局组件：Sidebar、TopBar、RootLayout | ✅ 已完成 | — | components/Sidebar.tsx、TopBar.tsx |
| **Phase 2** | **数据库 Schema 设计** | ✅ 已完成 | — | — |
| 2.5 | Prisma Schema 设计（4张表） | ✅ 已完成 | — | User/CoursePackage/Lesson/Attachment |
| 2.6 | Schema 文档 | ✅ 已完成 | [schema.md](tech/database/schema.md) | 4 张表，含 ER 图与迁移说明 |
| 2.7 | 本地 SQLite 开发环境配置 | ✅ 已完成 | — | prisma migrate dev 已执行 |
| **Phase 3** | **页面迁移（静态先行）** | ✅ 已完成 | — | — |
| 2.8 | 登录页 /app/page.tsx | ✅ 已完成 | — | LoginForm 组件 |
| 2.9 | 课程包列表页 /app/list/page.tsx | ✅ 已完成 | — | — |
| 2.10 | 课程包详情页 /app/detail/[slug]/page.tsx | ✅ 已完成 | — | — |
| 2.11 | 管理员后台页 /app/admin/page.tsx | ✅ 已完成 | — | — |
| 2.12 | 单课原型迁移至 /public/course-packages/ | ✅ 已完成 | — | 符合接入规范 v1，window.open |
| **Phase 4** | **API Routes 开发** | ✅ 已完成 | — | — |
| 2.13 | 登录认证 API（NextAuth.js v5） | ✅ 已完成 | — | auth.ts + /api/auth/[...nextauth] |
| 2.14 | 课程包列表 API | ✅ 已完成 | — | GET /api/packages |
| 2.15 | 课程包详情 API | ✅ 已完成 | — | GET /api/packages/[slug] |
| 2.16 | 管理员 CRUD API | ✅ 已完成 | — | GET/POST/PATCH/DELETE /api/admin/packages |
| **Phase 5** | **前后端联通** | ✅ 已完成 | — | — |
| 2.17 | 列表页接入真实数据 | ✅ 已完成 | — | 直接查询 Prisma，SSR |
| 2.18 | 详情页动态加载 | ✅ 已完成 | — | 按 slug 查询，含课次列表 |
| 2.19 | 登录认证接入，保护鉴权页面 | ✅ 已完成 | — | NextAuth v5 + proxy.ts 路由保护 |
| 2.20 | 管理员后台接入真实操作 | 🟡 待决策 | — | **[待决策]** 是否在 V1 实现后台 CRUD 联通；当前保留表单展示形式 |
| **Phase 6** | **验收** | ✅ 已完成 | — | — |
| 2.21 | 对照验收清单逐项核验 | ✅ 已完成 | [验收清单](../CLAUDE交接包/docs/08_验收清单.md) | 全部 14 项通过 |

---

### 阶段三：文档符合性修复

> 依据：对照交接包文档与原型 v4 的差异分析，方案见 [doc-compliance-fixes.md](product/doc-compliance-fixes.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 3.1 | Lesson 表新增 groupSize、aiRoundsCount 字段并迁移 | ✅ 已完成 | 其他修复的前置依赖 |
| 3.2 | 详情页课次 pills 补充人数与 AI 回合显示 | ✅ 已完成 | 依赖 3.1 |
| 3.3 | 列表页卡片底部补充人数与 AI 回合显示 | ✅ 已完成 | 依赖 3.1 |
| 3.4 | Sidebar 移除无效菜单链接 | ✅ 已完成 | 独立 |
| 3.5 | TopBar 移除无效导航链接 | ✅ 已完成 | 独立 |
| 3.6 | 列表页搜索/筛选接入真实 API | ✅ 已完成 | 独立 |
| 3.7 | 管理员后台增加 admin 角色校验 | ✅ 已完成 | 独立 |

---

## 状态说明

| 标记 | 含义 |
|------|------|
| ✅ 已完成 | 交付完毕，可验收 |
| 🔵 进行中 | 正在执行 |
| 🟡 待确认 | 需求或方案尚未确定 |
| ⬜ 待启动 | 任务已知，尚未开始 |
| 🔴 已阻塞 | 有依赖未解决 |

---

## 文档索引

| 文档 | 路径 |
|------|------|
| 接入规范 v1 | `CLAUDE交接包/source_refs/teacher-pack-content-integration-spec-v1.md` |
| 技术选型决策 | `docs/decisions/ADR-001-nextjs-migration.md` |
| Next.js 迁移方案 | `docs/tech/architecture/nextjs-migration-plan.md` |
| 数据库设计 | `docs/tech/database/schema.md` |
| API 设计 | `docs/tech/api/overview.md`（待创建）|
| 部署方案 | `docs/ops/vps-migration-guide.md` |
| 文档符合性修复计划 | `docs/product/doc-compliance-fixes.md` |
