# AI Dash — 项目交接上下文

> 本文件用于交接给 AI Agent，提供项目全貌和关键入口。

## 项目定位

**AI Dash** 是一个面向 K12 教育机构的智能课程系统，核心价值是用 AI 辅助教学主管设计课程，教师浏览和使用课程。

**四大模块**：
1. 教师授课系统 — 课程包浏览、课次内容渲染
2. AI 课程研发 — 从方向确认到审核发布的完整工作台
3. 问AI — 类 ChatGPT 对话（通用 + 课程设计模式，支持联网搜索）
4. 使用指南 — 按角色（教师/主管）显示的帮助文档

**三种角色**：`teacher`（教师）| `rd_manager`（教学主管）| `admin`（管理员）

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16 App Router |
| 语言 | TypeScript 5 |
| 样式 | 纯 CSS（BEM-lite），无 Tailwind |
| ORM | Prisma 6 |
| 数据库 | MySQL 8.0（本机 localhost） |
| 认证 | NextAuth.js v5（Credentials Provider） |
| 部署 | GitHub Actions → rsync → PM2 + Nginx |
| 测试 | Jest（76 套件 / 596+ 测试） |

## 目录结构

```
AIdash/
├── CLAUDE.md              # Claude Code 指导文件（最详细的架构文档）
├── app/                   # Next.js 应用根目录
│   ├── app/               # App Router 页面和 API
│   │   ├── page.tsx       # 登录页
│   │   ├── register/      # 邀请码注册页
│   │   ├── (app)/         # 认证保护的 Route Group
│   │   │   ├── list/      # 课程包列表
│   │   │   ├── detail/    # 课程包详情
│   │   │   ├── lesson/    # 课次渲染（全屏）
│   │   │   ├── course-rnd/# 课程研发（看板 + 方向 + 工作台）
│   │   │   ├── chat/      # 问AI对话（全屏）
│   │   │   ├── guide/     # 使用指南
│   │   │   ├── profile/   # 个人资料
│   │   │   └── admin/     # 管理后台（6 个子页面）
│   │   └── api/           # 70 个 API 路由
│   │       ├── admin/     # 管理 API
│   │       ├── chat/      # 对话 API
│   │       ├── course-rnd/# 课程研发 API
│   │       ├── export/    # ChatGPT GPTs 只读 API（6 个）
│   │       └── filter-tree/# 筛选树 API
│   ├── components/        # React 组件
│   │   ├── admin/         # 管理后台组件
│   │   ├── chat/          # 对话组件
│   │   ├── course-rnd/    # 课程研发组件
│   │   ├── guide/         # 使用指南组件
│   │   ├── lesson/        # 课次渲染组件
│   │   └── profile/       # 个人资料组件
│   ├── lib/               # 工具库
│   │   ├── ai/            # AI 服务层（14 个文件）
│   │   ├── prisma.ts      # Prisma 客户端
│   │   ├── permissions.ts # 权限矩阵
│   │   ├── auth-utils.ts  # 认证工具
│   │   ├── crypto.ts      # AES-256-GCM 加密
│   │   └── export-auth.ts # Export API Token 认证
│   ├── prisma/
│   │   ├── schema.prisma  # 23 个数据模型
│   │   ├── migrations/    # 17 个 migration
│   │   ├── seed.ts        # 默认账号种子
│   │   └── seed-baselines.ts # 基线 + 模板 + 预设种子
│   ├── __tests__/         # 76 个测试文件
│   └── public/
│       ├── avatars/       # 60 个预设头像（128x128 PNG）
│       └── openapi-export.json # GPTs Actions OpenAPI Schema
├── docs/                  # 产品文档 / 技术文档 / 基线 / ADR
└── .github/workflows/     # CI/CD
```

## 数据模型（23 个表）

| 分类 | 模型 |
|------|------|
| 核心 | User, CoursePackage, Lesson, Attachment |
| 课程研发 | CourseRndProject, DirectionVersion, PlanVersion, LessonDraft, AiCallLog, PublishRecord |
| AI 配置 | AiProvider, AiActionConfig |
| 基线/模板 | BaselineDoc, BaselineDocVersion, PromptTemplate, PromptTemplateVersion, Preset |
| 对话 | ChatConversation, ChatMessage |
| 组织 | Department, InviteCode |
| 系统 | OperationLog, SystemConfig |

## AI 服务架构

```
管理面板配置 AiProvider + AiActionConfig
       ↓
getProviderAndModel("generate_framework")
       ↓
resolveTemplate() → 从 DB 加载 Prompt 模板 + 注入基线
       ↓
createOpenAICompatProvider → chat/chatStream/generateImage
       ↓
AiCallLog（记录 promptLog + messageLog + templateId + versionNo）
```

**基线体系**：6 维度 23 条（通用 + 年龄段 A1-A4 + 难度 L1-L4 + 组织形态 S1-S2 + 产出物 P1-P11 + 矩阵），按项目属性自动拼装。

**联网搜索**：问AI对话通过 function calling 自主判断 → Tavily API → `[1][2]` 引用标注。

**ChatGPT GPTs 对接**：6 个只读 Export API（Bearer Token 认证），OpenAPI Schema 在 `/openapi-export.json`。

## 开发命令

```bash
cd app/
npm run dev          # 开发服务器 :3000
npm run typecheck    # tsc --noEmit
npm test             # Jest 全量测试
npm run test:coverage # 覆盖率报告
npx prisma migrate dev --name xxx  # 新 migration
npx prisma db seed   # 默认账号
npx tsx prisma/seed-baselines.ts   # 基线 + 模板种子
```

## 部署

GitHub Actions 推送 main 分支触发 → rsync 到服务器 → `deploy-remote.sh`（npm ci → prisma generate → migrate deploy → seed → build → PM2 restart）

生产服务器：`ssh -p 45605 root@38.175.193.100`

## 关键约束

1. 主链路不得增加层级：登录 → 列表 → 详情 → 进入本课
2. 导航结构已锁定：左侧 Sidebar
3. API 响应格式统一：`{ data: payload }`
4. 所有 AI 调用从 DB 读配置，不走 .env
5. Prompt 模板 DB 优先，硬编码兜底
6. 推送前必须得到用户明确指示
7. 功能变更必须同步更新使用指南（TeacherGuide / RdManagerGuide）

## 详细文档入口

- **最完整的架构文档**：`CLAUDE.md`（项目根目录）
- 数据库设计：`docs/tech/database/schema.md`
- API 路由总览：`docs/tech/api/overview.md`
- 课程研发 PRD：`docs/product/course-rnd-module-prd.md`
- AIGC 工程化经验：`docs/decisions/ADR-004-aigc-prompt-engineering-lessons.md`
- 火山方舟 API：`docs/decisions/ADR-005-volcengine-ark-api-integration.md`

## 给 Harness 的补充说明

### 禁止修改的区域
- `app/lib/crypto.ts` — AES-256-GCM 加密实现，安全核心，不得改动
- `app/lib/permissions.ts` — 权限矩阵，角色逻辑牵一发动全身，改前必须告知用户
- `app/prisma/migrations/` — 已有 migration 文件只读，新需求必须用 migrate dev 生成新文件
- `app/api/export/` — ChatGPT GPTs 对接 API，接口契约已外部依赖，不得改 path 和响应结构
- `app/public/openapi-export.json` — 同上，与 GPTs Actions 绑定

### 测试约束
- 测试命令必须在 `app/` 目录下运行，不是项目根目录
- 运行前确认本机 MySQL 8.0 已启动（localhost），否则数据库相关测试会全部失败
- 可并行
- 76 个套件是当前基线，任何改动后必须保证全量通过，不得减少

### 已知的坑
- AI 调用配置全部从数据库读取，**绝对不要**在代码里硬编码 API Key 或 model name
- Prompt 模板有版本控制（PromptTemplateVersion），修改模板要走版本，不要直接改当前版本
- 基线体系（6维度23条）拼装逻辑在 `lib/ai/` 下，修改前需完整理解拼装规则
- 火山方舟 API：不支持 `/models` 接口（无法自动获取模型列表和价格），价格单位是 CNY 非 USD，图片模型 Seedream 走 `/chat/completions` 而非 `/images/generations`。详见 ADR-005
- Tavily API：免费额度 1000 次/月，超出后 $5/1000 次。单次搜索 10s 超时。API Key 从 SystemConfig 加密读取，未配置时联网搜索静默禁用（不报错）

### 代码风格约定
- 样式用纯 CSS + BEM-lite，**禁止引入 Tailwind 或任何 CSS 框架**
- API 响应格式统一为 `{ data: payload }`，新接口必须遵守，不得返回裸数据
- 所有 AI 调用必须写入 AiCallLog（promptLog + messageLog + templateId + versionNo）
- 功能变更必须同步更新使用指南（TeacherGuide 和 RdManagerGuide 两份都要）
- 错误处理：用 `try/catch` 包裹外部调用（AI API、DB 查询），catch 块中不要静默吞掉错误，至少记录或返回给用户
- Server Component 和 Client Component 的拆分没有严格约定，按需使用

### 三种角色的权限边界
- `teacher` — 只读课程内容，不能访问 course-rnd 和 admin
- `rd_manager` — 可以操作课程研发全流程，不能访问 admin
- `admin` — 全权限
- 权限检查统一走 `lib/permissions.ts`，新功能不得绕过此文件

### 当前阶段和优先级
- 项目当前处于已发布，迭代新功能阶段
- 接下来最优先做的事是新功能

### 数据安全约束
- 生产服务器 IP 和 SSH 端口已在 context.md 中，Harness 不得将这些信息输出到任何日志或提交
- 数据库只在 localhost，不对外暴露，开发环境直接连本机