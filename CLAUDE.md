# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**AI Dash — 智能课程系统**。面向老师、教学主管（rd_manager）和管理员，包含三大模块：
1. **教师授课系统**：课程包管理、课次内容渲染（v2 JSON → LessonRenderer）
2. **课程研发模块**：AI 驱动的课程设计工作台（方向确认 → 详细方案 → 定稿发布）
3. **问AI模块**：类 ChatGPT 对话界面，支持通用模式和课程设计模式（注入基线知识），支持联网搜索（Tavily）
4. **使用指南**：按角色显示的操作指南（教师版/主管版），内嵌 TOC 导航

## 技术栈

Next.js 16 App Router + 纯 CSS 设计系统（BEM-lite） + Prisma 6 + MySQL + NextAuth.js v5 + PM2 + Nginx

> Tailwind CSS 已完全移除。样式系统为 `app/app/globals.css` 中的纯 CSS 变量 + BEM-lite 类名。

## 开发命令

```bash
cd app/

# 开发
npm run dev                    # 启动开发服务器 http://localhost:3000
npm run typecheck              # TypeScript 类型检查（tsc --noEmit）

# 测试
npm test                       # Jest 运行全部测试
npx jest __tests__/api/admin-users.test.ts  # 运行单个测试文件

# 数据库（本地与生产统一使用 MySQL，workflow 为 prisma migrate dev）
npx prisma migrate dev         # 修改 schema 后生成 migration 并应用
npx prisma migrate deploy      # 仅应用已有 migration（生产部署用）
npx prisma db seed             # 初始化默认账号（teacher01/teacher123、admin/admin123、rd01/rd123456）
npx tsx prisma/seed-baselines.ts  # 导入基线 + Prompt 模板 + 预设（幂等，可重复执行）
npx prisma studio              # GUI 数据库管理

# 本地开发数据库：mysql://root@localhost:3306/aidash_dev
# 启动 MySQL：brew services start mysql
```

## 架构

### Route Group 结构

```
app/
├── page.tsx                              # 登录页
├── register/page.tsx                    # 邀请码注册页（不在 Route Group 内）
├── globals.css                           # 纯 CSS 设计系统（BEM-lite）
└── (app)/                                # Route Group — 认证保护
    ├── layout.tsx                        # 认证检查 + AppShell（Sidebar + TopBar 常驻）
    ├── list/page.tsx                     # /list — 课程包列表
    ├── detail/[slug]/page.tsx            # /detail/:slug — 课程包详情
    ├── lesson/[slug]/[lessonId]/page.tsx  # /lesson/:slug/:id — 单课渲染
    ├── course-rnd/                       # 课程研发模块
    │   ├── page.tsx                      # /course-rnd — 研发进度看板
    │   ├── [projectId]/page.tsx          # /course-rnd/:id — 方向确认
    │   └── [projectId]/workbench/page.tsx # /course-rnd/:id/workbench — 工作台
    ├── chat/page.tsx                     # /chat — 问AI对话（联网搜索 + 引用标注）
    ├── guide/page.tsx                    # /guide — 使用指南（按角色显示）
    ├── profile/page.tsx                  # /profile — 个人资料
    └── admin/
        ├── layout.tsx                    # admin 角色校验
        ├── packages/page.tsx             # /admin/packages — 课程包管理
        ├── users/page.tsx                # /admin/users — 用户管理（含部门管理、邀请码管理）
        ├── ai-settings/page.tsx          # /admin/ai-settings — AI 服务配置
        ├── ai-logs/page.tsx              # /admin/ai-logs — AI 调用记录（prompt 审计）
        ├── prompt-config/page.tsx        # /admin/prompt-config — Prompt 配置（基线/模板/预设）
        └── operation-logs/page.tsx       # /admin/operation-logs — 操作日志
```

### Layout 持久化架构

`(app)/layout.tsx` 渲染 `AppShell`（Sidebar + TopBar + ToastProvider），子路由切换时**不卸载不重建**。

```
AppShell (client component, 常驻)
├── ToastProvider（全局 toast 轻提示）
├── TopBarProvider（页面动态注入标题/面包屑/操作按钮）
├── Sidebar（完全自治：内部 fetch 筛选树/课次导航）
└── <main>
    ├── TopBar（← 返回{上级} | {标题} + 右侧操作按钮 + 用户头像）
    └── {children}
```

**TopBar 注入模式**：各页面通过 `<SetTopBar breadcrumb="管理后台" title="AI 服务配置" actions={...} />` 注入内容，卸载时自动清除。

**全屏页面处理**：课次页（`isLessonPage`）和对话页（`isChatPage`）走全屏模式——隐藏 `main__content` padding，`main` 设 `overflow: hidden`。课次页还隐藏通用 TopBar。

**滚动隔离**：`.page-wrap { height: 100vh; overflow: hidden }` + `body { overflow: hidden }` 锁定视口。Sidebar 和 `main__content` 各自独立滚动（`overflow-y: auto`），TopBar 始终可见。无圆角容器——应用铺满全屏，避免 `overflow: hidden` 裁剪问题。

### 角色与权限

三种角色：`teacher` | `rd_manager` | `admin`

权限矩阵在 `lib/permissions.ts`，API 统一用 `requireRole()` + `forbiddenResponse()` 守卫（`lib/auth-utils.ts`）。

**用户注册**：通过邀请码注册（仅 admin 可生成邀请码），注册后默认 `rd_manager` 角色。注册页在 `/register`（不在 `(app)` Route Group 内，无需认证）。

**个人资料**：用户可修改姓名、邮箱、手机、部门、头像（60 个预设卡通头像）。入口在右上角头像下拉菜单。

### 数据模型

**核心表**（4张）：`User`（含 email/phone/avatarUrl/departmentId） / `CoursePackage` / `Lesson` / `Attachment`

**课程研发表**（6张）：`CourseRndProject` / `CourseRndDirectionVersion` / `CourseRndPlanVersion` / `CourseRndLessonDraft` / `CourseRndAiCallLog`（含 promptLog/messageLog 审计字段） / `CourseRndPublishRecord`

**AI 配置表**（2张）：`AiProvider`（服务商，含加密 API Key + 可选代理） / `AiActionConfig`（动作→模型映射 + 价格，含 pricePerCall 按次计费）

**基线与 Prompt 表**（5张）：`BaselineDoc`（按维度拆分的基线文档） / `BaselineDocVersion`（基线版本历史） / `PromptTemplate`（9 个动作的 prompt 模板） / `PromptTemplateVersion`（模板版本历史） / `Preset`（课程方向/图片风格/标签预设）

**对话表**（2张）：`ChatConversation`（对话，含 mode: general/course_design） / `ChatMessage`（消息，role: user/assistant）

**组织管理表**（2张）：`Department`（部门） / `InviteCode`（邀请码，含 maxUses/usedCount/expiresAt）

**系统表**（2张）：`OperationLog` / `SystemConfig`（key-value，存汇率等）

### AI 服务架构

```
管理面板配置：AiProvider（服务商+Key+代理） → AiActionConfig（动作→模型映射）
                                                    ↓
课程研发调用：getProviderAndModel("generate_framework") → createOpenAICompatProvider → proxyFetch
```

关键文件：
- `lib/ai/provider.ts` — Provider 工厂 + chat/chatStream/generateImage 方法（支持多轮 messages + function calling tools 参数）
- `lib/ai/pricing-service.ts` — 价格自动获取 + 汇率 + DB-backed 费用计算（支持 per-token 和 per-call 两种计费）
- `lib/ai/build-content-data.ts` — AiLessonOutput → v2 contentData 格式转换
- `lib/ai/prompts.ts` — 硬编码 prompt（fallback 用），DB 模板优先
- `lib/ai/template-engine.ts` — Prompt 模板变量引擎（getSystemPrompt 含基线注入 + resolveLightPrompt 仅变量替换）
- `lib/ai/baseline-assembler.ts` — 按项目属性拼装多维度基线（60s 缓存）
- `lib/ai/chat-prompts.ts` — 对话模式系统 prompt（通用 + 课程设计模式含基线注入，自动注入当前日期）
- `lib/ai/chat-with-tools.ts` — 联网搜索编排器（LLM 调用→Tavily 搜索→二次 LLM 调用，支持 function calling + prompt fallback）
- `lib/ai/tavily.ts` — Tavily API 客户端（API Key 从 SystemConfig 加密读取）
- `lib/ai/web-search-tools.ts` — 搜索工具定义 + 结果格式化 + 引用指令
- `lib/ai/template-variables.ts` — 28 个预定义模板变量元数据
- `lib/proxy-fetch.ts` — SOCKS5/HTTP 代理支持（用 node:https，非原生 fetch）
- `lib/crypto.ts` — AES-256-GCM 加密 API Key

**图片生成**：`generateImage` 优先 chat 接口（Gemini/GPT-5-image），回退 `/images/generations`（DALL-E）。GPT-5-image 模型图片在 `message.images` 字段。

**代理**：按提供商配置 `proxyUrl` 字段（如 `socks5://127.0.0.1:1080`），通过 Xray 出站。代理请求用 `node:https` + `socks-proxy-agent`（原生 fetch 不支持 agent）。

**联网搜索**：问AI对话中 LLM 通过 function calling 自主判断是否需要搜索。流程：LLM 第一次调用（带 tools）→ 检测 `web_search` tool_call → Tavily API 搜索 → LLM 第二次调用（注入搜索结果，无 tools 防循环）→ 流式输出含 `[1][2]` 引用的回答。不支持 function calling 的模型通过 prompt fallback（`[SEARCH: query]` 格式）兜底。Tavily API Key 存储在 `SystemConfig` 表中（加密），管理员在 `/admin/ai-settings` 的「外部服务密钥」区域配置。来源通过 `<!-- sources::[...] -->` HTML 注释嵌入消息内容持久化，前端提取后渲染来源链接列表。

### 基线与 Prompt 模板架构

```
管理端配置：BaselineDoc（23条，按维度拆分） + PromptTemplate（6个动作） + Preset（34个预设）
                                                ↓
AI 调用时：getSystemPrompt("generate_framework", context)
           → 加载 PromptTemplate（DB 优先，fallback 硬编码）
           → assembleBaselines（按项目 ageRange/level/orgForm/deliverableType 匹配维度）
           → 替换 {{变量名}}（28 个预定义变量）
           → 返回最终 prompt
```

**基线维度**：通用(1) + 年龄段 A1-A4(4) + 难度 L1-L4(4) + 组织形态 S1-S2(2) + 产出物 P1-P11(11) + 矩阵(1) = 23 条。按项目属性自动拼装，只注入匹配维度。

**Prompt 模板**：9 个动作（generate_framework / revise_framework / regenerate_lesson / revise_lesson / rewrite_field / rewrite_teaching_talk / validate_lesson / package_cover / generate_title），支持 `{{变量名}}` 插值，管理员可在 /admin/prompt-config 编辑。

**版本管理**：基线和模板每次编辑自动创建版本记录，支持回滚和逐行 diff 对比。

**零行为变化保障**：DB 无模板时 `getSystemPrompt()` 返回 null，调用方 fallback 到 `prompts.ts` 中的硬编码 prompt。

**种子数据**：`npx tsx prisma/seed-baselines.ts` — 从 `docs/baseline/` 导入 23 条基线 + 9 个默认模板（含基线变量） + 34 个预设。种子脚本**只创建不覆盖**已有模板，保护管理员的修改。

**Prompt 审计**：每次 AI 调用记录完整的 `promptLog`（system prompt）和 `messageLog`（user message）到 `CourseRndAiCallLog`，可在 `/admin/ai-logs` 查看。

### CSS 设计系统

`app/globals.css` — 纯 CSS，无 Tailwind，无预处理器。

- `:root` 定义所有设计令牌（颜色、间距 8px 网格、圆角、阴影）
- BEM-lite 命名：`.sidebar__nav-item--active`、`.lesson-block--box--danger`
- 视觉基调：浅蓝紫雾光科技感
- 按钮层级：`btn`（主要）→ `btn--soft`（次要）→ `btn--danger`（红字透明底，页面用）→ `btn--danger-fill`（白字红底，弹窗确认用）
- 尺寸：`btn--xs` / `btn--sm` / `btn--lg`
- Toast：`.toast-container` + `.toast--success/error/info`
- Combobox：`.combobox` + `.combobox__dropdown`（模型搜索选择器）

### 部署

GitHub Actions → rsync 到腾讯云服务器 → `deploy-remote.sh`（npm ci + prisma generate + migrate deploy + build + PM2 restart）

Nginx 配置在 `deploy-remote.sh` 中自动生成，`/api/course-rnd/` 和 `/api/chat/` 路径有特殊配置（`proxy_buffering off` + `proxy_read_timeout 180s`）用于 SSE 流和图片生成。

**运行时数据分离**：AI 生成的图片存储在 `/opt/aidash/uploads/ai-images/`（通过 `AI_IMAGES_DIR` 环境变量），课程包上传在 `/opt/aidash/uploads/course-packages/`——均在部署目录外，rsync `--delete` 不会删除。

## 冻结约束（不得擅自修改）

1. **主链路不得增加层级**：`登录页 → 课程包列表页 → 课程包详情页 → 进入本课 → 已确认原型页`
2. **"进入本课"行为**：Next.js router 跳转至 `/lesson/[slug]/[lessonId]`，由 `LessonRenderer` 渲染 v2 JSON
3. **样板课内容不得替换**：第一个课程包必须是《我的神奇搭档课程包》
4. **视觉风格不得偏移**：浅蓝紫雾光科技感
5. **导航结构已锁定**：左侧 Sidebar 方案

## 关键设计决策

- **AI 只生成内容，系统组装格式**：AI 输出 `AiLessonOutput`（简单字段），`buildContentData()` 转换为 v2 JSON。格式 100% 由代码控制。
- **修改走增量合并**：revise API 让 AI 只输出变更字段，系统 merge 到现有数据。
- **所有 AI 调用从数据库读配置**：无 .env fallback，未配置时抛错提示管理员。
- **Prompt 模板 DB 优先，硬编码兜底**：`getSystemPrompt()` 优先从 DB 加载模板并替换变量，DB 无数据时 fallback 到 `prompts.ts` 硬编码。
- **基线按维度拼装，非全量注入**：根据项目属性只注入匹配的基线维度，节省 ~60% token 消耗。
- **图片修改与文本修改交互统一**：点击预览中的图片/板块标题 → 关联反馈输入框 → 提交修改意见。
- **数据库 migration 工作流**：本地和生产统一用 `prisma migrate dev/deploy`，不用 `db push`。
- **图片 prompt 组装统一**：所有图片生成链路遵循 `构图引导 + 年龄提示 + 风格前缀 + 内容描述` 的拼接顺序，构图引导仅用于课次标题图（不用于课程包封面）。
- **API 响应格式统一**：所有 API 返回 `{ data: payload }` 格式，前端用 `json.data ?? json` 解包。
- **每次 AI 调用记录完整 prompt**：用于事后审计和问题排查（`promptLog` + `messageLog` 字段）。
- **对话 system prompt 注入当前日期**：避免 LLM 幻觉日期，格式如"2026年3月19日，星期四"。
- **联网搜索来源嵌入消息内容**：`<!-- sources::[...] -->` HTML 注释方式，零 schema 变更，前端解析后渲染。
- **使用指南内容同步维护**：新增/调整功能时必须同步更新 `TeacherGuide.tsx` 和 `RdManagerGuide.tsx`，内容顺序与侧边栏菜单一致。

## 工作流约定

- 推送前必须得到用户明确指示
- 代码修改后运行 `npm run typecheck` + `npm test` 确认无破坏
- Schema 修改必须同时创建 migration（`npx prisma migrate dev --name xxx`）
- 生产服务器可通过 `ssh -p 45605 root@38.175.193.100` 访问

## 关键参考文档

- 教师授课系统 PRD：`docs/product/teacher-system-prd.md`
- 接入规范 v2：`docs/product/content-integration-spec-v2.md`
- 课程研发 PRD：`docs/product/course-rnd-module-prd.md`
- 问 AI 对话模块 PRD：`docs/product/chat-module-prd.md`
- 基线与 Prompt 配置 PRD：`docs/product/baseline-prompt-config-prd.md`
- 管理员模块需求（v1 + v2）：`docs/product/admin-module-requirements*.md`
- 基线与 Prompt 技术方案：`docs/tech/baseline-prompt-template-implementation-plan.md`
- 数据库设计（21 个模型）：`docs/tech/database/schema.md`
- API 路由总览（53 个）：`docs/tech/api/overview.md`
- 课程设计基线文档（v3 + 分维度）：`docs/baseline/`
- 视觉设计规范：`docs/design/guidelines/`
- 项目进度：`docs/PROJECT_STATUS.md`
- 技术决策：`docs/decisions/ADR-*.md`
- AIGC 工程化经验：`docs/decisions/ADR-004-aigc-prompt-engineering-lessons.md`
- 问AI模块技术方案：`docs/tech/chat-module-implementation-plan.md`
- 火山方舟 API 集成：`docs/decisions/ADR-005-volcengine-ark-api-integration.md`
