# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**AI Dash — 教师授课系统**，面向老师与管理员，用于统一管理课程包、进入具体课程，并承载按规范接入的单课教师课包内容。

当前处于**阶段一（纯 HTML 原型已完成）→ 阶段二（Next.js 迁移，已完成）→ 阶段三至八（持续迭代中）**。

## 当前技术栈

**阶段一（已完成）**：纯 HTML + 原生 CSS（CSS 变量）+ 原生 JS，无构建工具，直接用静态服务器打开。

**阶段二及以后（生产）**：Next.js 16 App Router + 纯 CSS 设计系统（BEM-lite 命名） + Prisma 6 + 腾讯云 TDSQL-C MySQL + NextAuth.js v5 + PM2 + Nginx。

> 注意：Tailwind CSS 已完全移除。样式系统为 `app/app/globals.css` 中的纯 CSS 变量 + BEM-lite 类名。

## 开发命令

```bash
cd app/

# 开发
npm run dev                    # 启动开发服务器 http://localhost:3000

# 构建
npm run build                  # Next.js 生产构建
npm run start                  # 生产服务器
npm run typecheck              # TypeScript 类型检查（tsc --noEmit）

# 测试
npm test                       # Jest 运行全部测试
npm run test:coverage          # 测试覆盖率报告
npx jest __tests__/api/admin-users.test.ts  # 运行单个测试文件

# 数据库
npx prisma db push             # 同步 schema 到数据库（本地开发用）
npx prisma db seed             # 初始化默认账号（teacher01/teacher123、admin/admin123）
npx prisma studio              # GUI 数据库管理

# 本地开发注意：
# schema.prisma 中 provider 需改为 "sqlite"，.env 使用 "file:./dev.db"
# 提交前必须还原为 "mysql" + @db.LongText
```

## 架构

### Route Group 结构

```
app/
├── page.tsx                             # 登录页（无需认证）
├── layout.tsx                           # 根 layout（html/body）
├── globals.css                          # 纯 CSS 设计系统（~1700行，BEM-lite）
└── (app)/                               # Route Group（不影响 URL）
    ├── layout.tsx                       # 认证检查 + AppShell（Sidebar 常驻）
    ├── list/page.tsx                    # /list — 课程包列表
    ├── detail/[slug]/page.tsx           # /detail/:slug — 课程包详情
    ├── lesson/[slug]/[lessonId]/page.tsx # /lesson/:slug/:id — 单课渲染
    └── admin/
        ├── layout.tsx                   # admin 角色校验
        ├── packages/page.tsx            # /admin/packages — 课程包管理
        └── users/page.tsx               # /admin/users — 用户管理
```

### Layout 持久化架构

`(app)/layout.tsx` 渲染 `AppShell`（包含 Sidebar + TopBar），在子路由切换时**不卸载不重建**——这是解决侧栏闪烁的根本方案。

```
AppShell (client component, 常驻)
├── Sidebar（完全自治：内部 fetch 筛选树/课次导航，根据 pathname 自动切换上下文）
└── <main>
    ├── TopBar（常驻，通过 TopBarContext 接收面包屑）
    └── {children}（各页面只输出纯业务内容）
```

**关键设计决策**：
- Sidebar 不接受外部 children/props（除 userName/userRole），所有导航数据通过 `/api/filter-tree` 和 `/api/lesson-nav` 自行获取
- TopBar 通过 `TopBarContext` 允许子页面动态注入面包屑（详情页使用 `<SetBreadcrumb>`）
- 课次页有特殊高度约束（`calc(100vh - 40px)`），AppShell 根据 `isLessonPage` 条件处理

### CSS 设计系统

`app/globals.css` — 纯 CSS，无 Tailwind，无预处理器。

- `:root` 中定义所有设计令牌（颜色、间距 8px 网格、圆角、阴影、过渡）
- BEM-lite 命名：`.sidebar__nav-item--active`、`.lesson-block--box--danger`
- 视觉基调：浅蓝紫雾光科技感（高亮度、通透、教师友好）
- 包含微交互（hover/active）、keyframes 动画、打印媒体查询

### 认证

NextAuth.js v5 Credentials 提供者（用户名 + 密码，bcryptjs 哈希）。

- `(app)/layout.tsx` 统一做认证检查，未登录重定向到 `/`
- `(app)/admin/layout.tsx` 统一做 admin 角色校验
- 各页面不再重复调用 `auth()`

### 数据模型

4 张表：`User` / `CoursePackage` / `Lesson` / `Attachment`

关键字段：
- `User.role` — `"teacher"` | `"admin"`
- `Lesson.contentData` — `@db.LongText`，存储 v2 JSON（`{ hero, sections }`）
- `Lesson.contentPath` — v1 遗留，保留但不使用
- `CoursePackage.status` — `"published"` | `"draft"` | `"offline"`

## 冻结约束（不得擅自修改）

1. **主链路不得增加层级**：`登录页 → 课程包列表页 → 课程包详情页 → 进入本课 → 已确认原型页`
2. **"进入本课"行为**：通过 Next.js router 跳转至 `/lesson/[slug]/[lessonId]` 页面，主内容区由 `LessonRenderer` 组件渲染 v2 结构化 JSON（存于 `Lesson.contentData` 字段），保持完整系统导航（Sidebar + TopBar）。内容通过管理后台上传 zip 包导入数据库，不再依赖独立 HTML 文件。（历史：2026-03-14 由 `window.open` → iframe；后续迁移至 v2 JSON 渲染，见 ADR-003）
3. **样板课内容不得替换**：第一个课程包必须是《我的神奇搭档课程包》真实内容，封面主图见 `docs/design/guidelines/extracted/claude_teacher_visual_handoff/assets/03_我的神奇搭档课程包主图_最终确认版.png`
4. **视觉风格不得偏移**：浅蓝紫雾光科技感，设计规范见 `docs/design/guidelines/`，实现在 `app/app/globals.css`
5. **废弃页面不得恢复**：~~单课教师课包接入页~~已废弃
6. **导航结构已锁定**：全局采用左侧 Sidebar 方案（Layout 层常驻）。视觉交接包参考图中出现的顶部水平导航栏**不适用于本项目当前阶段**，不得引入。

## 单课内容接入规范（当前：v2）

> v1（iframe + HTML 文件）已废弃，v2（ZIP 上传 → JSON 入库 → LessonRenderer 渲染）为现行规范。

**v2 课程包 ZIP 结构：**
```
课程包名/
├── package.json          # 课程包元信息（title、slug、ageRange、level 等）
└── lessons/
    └── lesson-01/
        ├── lesson.json   # 课次元信息 + sections 内容字段（必填）
        └── assets/       # 图片等静态资源
```

**lesson.json 核心要求：** 必须包含 `sections` 字段（结构化 Block 数组），由 `POST /api/admin/upload` 上传后序列化为 `Lesson.contentData`（LongText JSON）存入数据库。

**Block 类型：** text / quote / list / template / box / grid / accordion / qa_pair

详细规范见：`docs/product/content-integration-spec-v2.md`

## 目录结构

```
AIdash/
├── index.html / list.html / detail.html  # 阶段一原型（只读参考）
├── app/                        # Next.js 应用（生产）
│   ├── app/
│   │   ├── page.tsx            # 登录页
│   │   ├── globals.css         # 纯 CSS 设计系统（BEM-lite）
│   │   ├── (app)/              # Route Group（认证保护）
│   │   │   ├── layout.tsx      # 认证 + AppShell
│   │   │   ├── list/page.tsx   # 课程包列表页
│   │   │   ├── detail/[slug]/  # 课程包详情页
│   │   │   ├── lesson/[slug]/[lessonId]/  # 单课渲染页（LessonRenderer）
│   │   │   └── admin/          # 管理后台（含 admin layout 角色校验）
│   │   └── api/                # API 路由
│   ├── components/             # React 组件
│   │   ├── AppShell.tsx        # 应用外壳（Sidebar + TopBar 常驻）
│   │   ├── Sidebar.tsx         # 自治侧栏（内部管理所有导航数据）
│   │   ├── TopBar.tsx          # 顶栏（从 TopBarContext 读取面包屑）
│   │   ├── TopBarContext.tsx   # 面包屑 Context + SetBreadcrumb 组件
│   │   ├── lesson/             # LessonRenderer、CopyButton、LessonToc、ProgressBar
│   │   ├── ui/                 # 通用 UI（已废弃，样式迁移至 globals.css）
│   │   └── admin/              # AdminPackageList、AdminUserList、UploadModal…
│   └── prisma/schema.prisma    # 数据库 Schema
├── docs/
│   ├── PROJECT_STATUS.md       # 项目进度总览（实时维护）
│   ├── decisions/              # 重要决策记录 ADR
│   ├── product/                # 产品与需求文档
│   ├── tech/                   # 技术方案（架构/API/数据库）
│   ├── design/guidelines/      # 视觉设计规范与参考图
│   └── ops/                    # 运维与部署方案
└── CLAUDE交接包/               # 原始交接资产（只读，不得修改）
```

## 项目管理规则

### 进度追踪
- 所有任务状态实时维护在 `docs/PROJECT_STATUS.md`
- 每次完成任务或确认方案后必须更新该文件
- 状态标记：✅ 已完成 / 🔵 进行中 / 🟡 待确认 / ⬜ 待启动 / 🔴 已阻塞

### 文档保存
收到"保存文档"指令时，按类型存入对应目录：

| 类型 | 目录 |
|------|------|
| 需求、功能规格 | `docs/product/` |
| 技术方案、架构、API、数据库 | `docs/tech/` |
| 视觉规范、UI 基线 | `docs/design/` |
| 部署、运维方案 | `docs/ops/` |
| 重要决策记录 | `docs/decisions/ADR-{序号}-{描述}.md` |

### 方案确认原则
- 重要方案需与用户充分讨论后确认，再开始实现
- 方案确认后形成对应文档，链接记录进 `PROJECT_STATUS.md`

### README 自动更新规则
每次执行 git push 前，必须更新 `README.md` 中的动态区域，确保准确反映最新版本信息。

**动态区域标记**（仅更新标记内的内容，固定章节不得覆盖）：
- `<!-- DYNAMIC:FEATURES -->` ... `<!-- /DYNAMIC:FEATURES -->` — 功能概览
- `<!-- DYNAMIC:TECH -->` ... `<!-- /DYNAMIC:TECH -->` — 技术栈版本
- `<!-- DYNAMIC:STRUCTURE -->` ... `<!-- /DYNAMIC:STRUCTURE -->` — 目录结构

**语言要求**：中英双语，中文在前，英文在后。

**目标读者**：内部团队（开发 + 产品 + 运营），兼顾项目背景、功能说明和技术细节。

**固定章节**（不得自动修改）：项目简介、部署说明、使用说明、开发指南。

## 关键参考文档

- 接入规范 v2（当前）：`docs/product/content-integration-spec-v2.md`
- 接入规范 v1（已废弃，只读）：`CLAUDE交接包/source_refs/teacher-pack-content-integration-spec-v1.md`
- 视觉设计规范：`docs/design/guidelines/extracted/claude_teacher_visual_handoff/docs/01_教师授课系统视觉设计规范.md`
- 技术选型决策：`docs/decisions/ADR-001-nextjs-migration.md`
- 单课页方案演进：`docs/decisions/ADR-002-lesson-iframe-approach.md`（已被 ADR-003 取代）
- 内容接入 v2 决策：`docs/decisions/ADR-003-content-spec-v2.md`
- 项目进度：`docs/PROJECT_STATUS.md`
