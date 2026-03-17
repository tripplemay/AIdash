# AI Dash — 教师授课系统 + 课程研发系统

> 面向教师、教研主管和管理员的 AI 驱动课程管理与研发平台。

---

## 项目简介

AI Dash 包含两大模块：

1. **教师授课系统** — 课程包浏览、课次内容渲染（v2 JSON → LessonRenderer）
2. **课程研发模块** — AI 驱动的课程设计工作台（方向确认 → 框架生成 → 详细方案 → 审核 → 发布）

---

## 功能概览

### 教师端

- 课程包列表：按年龄段、级别筛选浏览
- 课程包详情：封面、简介、课次列表
- 单课渲染：v2 JSON 结构化内容，7 个教学板块
- 侧边栏课次导航：进入单课后可快速切换

### 课程研发（教研主管 / 管理员）

- **研发进度看板**：手风琴布局（进行中/已定稿/已结束），一行一卡
- **方向确认**：结构化表单（下拉选择年龄段/难度/组织形态/产出物 + 标签多选核心诉求/约束 + 图片风格预设）→ AI 生成框架 + 自动生成封面
- **框架修订**：输入修改意见，AI 增量调整框架，保留未变动部分
- **工作台**：逐课生成详细方案（真实流式进度）→ 逐课修改（支持暂存多条意见批量提交）→ 保存版本
- **AI 审核**：定稿前 AI 按基线逐项检查（10 项），输出审核报告，可忽略并定稿或返回修改
- **一键发布**：自动预填课程包信息，发布到教师端课程库

### 管理后台

- **课程包管理**：上传 zip 接入、上下线、删除
- **用户管理**：新增/编辑/重置密码/删除用户
- **AI 服务配置**：服务商管理（含代理）、动作→模型映射、价格管理、连接测试
- **Prompt 配置**：基线编辑（按维度拆分，版本管理 + diff 对比 + 回滚）、提示词模板编辑（变量点击插入）、预设管理（课程方向/图片风格/标签）
- **操作日志**：全操作审计记录

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 样式 | 纯 CSS 设计系统（BEM-lite，浅蓝紫雾光科技感）|
| 数据库 | MySQL（本地 + 生产统一） |
| ORM | Prisma 6 |
| 认证 | NextAuth.js v5 (Credentials) |
| AI | OpenAI 兼容 API（支持 OpenRouter / PackyAPI 等），流式 SSE |
| 代理 | SOCKS5/HTTP 代理（Xray），按服务商配置 |
| 部署 | 腾讯云 VPS + PM2 + Nginx + GitHub Actions CI/CD |

---

## 核心架构

### AI 生成流程

```
用户填写表单 → AI 生成框架 + 封面 → 用户修订/确认
    → 逐课 AI 生成详细方案（流式 SSE）→ 用户修改（暂存+批量提交）
    → AI 审核 → 定稿 → 一键发布
```

### 基线与 Prompt 模板

```
管理员配置：BaselineDoc（23条，按维度拆分） + PromptTemplate（6个动作） + Preset（34+预设）
    ↓
AI 调用时：按项目属性（年龄段/难度/组织形态/产出物）自动拼装匹配基线
    → 模板变量替换（28个预定义变量）→ 最终 prompt
```

### 角色与权限

| 角色 | 教师端 | 课程研发 | 管理后台 | Prompt 配置 |
|------|--------|---------|---------|------------|
| teacher | 浏览课程 | - | - | 只读 |
| rd_manager | 浏览课程 | 全功能 | 课程包管理 | 只读 |
| admin | 浏览课程 | 全功能 | 全功能 | 编辑 |

### 数据模型

- **核心表**：User / CoursePackage / Lesson / Attachment
- **课程研发表**：CourseRndProject / DirectionVersion / PlanVersion / LessonDraft / AiCallLog / PublishRecord
- **AI 配置表**：AiProvider / AiActionConfig
- **基线与 Prompt 表**：BaselineDoc / BaselineDocVersion / PromptTemplate / PromptTemplateVersion / Preset
- **系统表**：OperationLog / SystemConfig

---

## 部署说明

### CI/CD 流程

推送 `app/` 目录变更至 `main` 分支后自动触发：

1. GitHub Actions 执行 TypeScript 类型检查
2. rsync 同步 `app/` 到服务器
3. 服务器执行 `deploy-remote.sh`：npm ci → prisma generate → migrate deploy → build → PM2 restart

### 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL 连接串 |
| `AUTH_SECRET` | NextAuth 密钥 |
| `AUTH_TRUST_HOST` | `true`（Nginx 反代必须） |
| `ENCRYPTION_KEY` | AES-256-GCM 密钥（加密 AI API Key） |

### 首次部署后

1. `npx prisma db seed` — 初始化默认账号
2. `npx tsx prisma/seed-baselines.ts` — 导入基线 + Prompt 模板 + 预设
3. 管理后台 → AI 服务配置 → 添加服务商 + 配置动作映射
4. 管理后台 → 课程包管理 → 上传课程包 zip

---

## 开发指南

### 本地环境搭建

```bash
cd app
npm install
cp .env.example .env              # 填入本地 MySQL 连接串 + 密钥
brew services start mysql          # 启动本地 MySQL
npx prisma migrate dev             # 创建表结构
npx prisma db seed                 # 初始化账号（teacher01/teacher123、admin/admin123、rd01/rd123456）
npx tsx prisma/seed-baselines.ts   # 导入基线 + 模板 + 预设
npm run dev                        # http://localhost:3000
```

### 常用命令

```bash
npm run dev                        # 启动开发服务器
npm run typecheck                  # TypeScript 类型检查
npm test                           # Jest 运行全部测试
npx jest __tests__/path/file.test.ts  # 运行单个测试
npx prisma migrate dev --name xxx  # 创建数据库迁移
npx prisma studio                  # GUI 数据库管理
```

### 默认账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 教师 | `teacher01` | `teacher123` |
| 管理员 | `admin` | `admin123` |
| 教研主管 | `rd01` | `rd123456` |

---

## 文档索引

| 文档 | 路径 |
|------|------|
| 项目进度 | `docs/PROJECT_STATUS.md` |
| 课程研发 PRD | `docs/product/course-rnd-module-prd.md` |
| 基线与 Prompt PRD | `docs/product/baseline-prompt-config-prd.md` |
| 接入规范 v2 | `docs/product/content-integration-spec-v2.md` |
| 课程设计基线（分维度） | `docs/baseline/` |
| 上下文流程分析 | `docs/tech/course-generation-context-flow.md` |
| 工作流优化方案 | `docs/tech/course-workflow-optimization-plan.md` |
| 基线模板技术方案 | `docs/tech/baseline-prompt-template-implementation-plan.md` |
| 技术决策 | `docs/decisions/ADR-*.md` |
| 视觉设计规范 | `docs/design/guidelines/` |
