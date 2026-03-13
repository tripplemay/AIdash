# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**AI Dash — 教师授课系统**，面向老师与管理员，用于统一管理课程包、进入具体课程，并承载按规范接入的单课教师课包内容。

当前处于**阶段一（纯 HTML 原型已完成）→ 阶段二（迁移 Next.js，进行中）**。

## 当前技术栈

**阶段一（已交付）**：纯 HTML + 原生 CSS（CSS 变量）+ 原生 JS，无构建工具，直接用静态服务器打开。

**阶段二（规划中）**：Next.js App Router + Tailwind CSS + Prisma + 腾讯云 TDSQL-C PostgreSQL。

## 冻结约束（不得擅自修改）

1. **主链路不得增加层级**：`登录页 → 课程包列表页 → 课程包详情页 → 进入本课 → 已确认原型页`
2. **"进入本课"行为**：必须用 `window.open` 新标签打开独立 HTML，不得用 iframe 包壳或动态渲染
3. **样板课内容不得替换**：第一个课程包必须是《我的神奇搭档课程包》真实内容，主图严格使用 `assets/images/my-magical-partner-cover.png`
4. **视觉风格不得偏移**：浅蓝紫雾光科技感，CSS 变量体系定义在 `assets/style.css`
5. **废弃页面不得恢复**：~~单课教师课包接入页~~已废弃

## 单课内容接入规范（v1 核心）

每个单课包必须包含：`index.html` + `assets/` + `attachments/` + `lesson.json`

单课内容必须**可脱离系统独立运行**，系统不负责动态拼装单课主体内容。

当前样板课路径：`course-packages/my-magical-partner/lessons/lesson-01/`

## 目录结构

```
AIdash/
├── index.html                  # 登录页（系统入口）
├── list.html                   # 课程包列表页
├── detail.html                 # 课程包详情页
├── admin.html                  # 管理员后台页
├── assets/
│   ├── style.css               # 全局 CSS 变量与样式（浅蓝紫雾光科技感）
│   └── images/                 # 已确认视觉资源（不得替换）
├── course-packages/
│   └── my-magical-partner/     # 样板课程包（符合接入规范 v1）
│       ├── package.json
│       └── lessons/lesson-01/
│           ├── index.html      # 已确认单课原型（进入本课落点）
│           ├── lesson.json
│           ├── assets/
│           └── attachments/    # 4 种标准附件类型目录
├── docs/
│   ├── PROJECT_STATUS.md       # 项目进度总览（实时维护）
│   ├── decisions/              # 重要决策记录 ADR
│   ├── product/                # 产品与需求文档
│   ├── tech/                   # 技术方案（架构/API/数据库）
│   ├── design/                 # UI/UX 视觉规范
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

## 关键参考文档

- 接入规范 v1：`CLAUDE交接包/source_refs/teacher-pack-content-integration-spec-v1.md`
- 开发冻结项：`CLAUDE交接包/docs/02_开发冻结项与主链路.md`
- 验收清单：`CLAUDE交接包/docs/08_验收清单.md`
- 技术选型决策：`docs/decisions/ADR-001-nextjs-migration.md`
- 项目进度：`docs/PROJECT_STATUS.md`
