# AI Dash 教师授课系统 — 项目进度总览

> 最后更新：2026-03-27

---

## 当前阶段

**阶段一：纯 HTML 原型落地** ✅ 已完成
**阶段二：迁移至 Next.js 框架** ✅ 已完成 — 全部 6 个 Phase 已完成并验收通过
**阶段三：文档符合性修复** ✅ 已完成
**阶段四：单课页体验优化** ✅ 已完成
**阶段五：管理员模块（v1）** ✅ 已完成
**阶段六：内容接入规范 v2 + 前端重构** ✅ 已完成
**阶段七：课程研发模块** ✅ 已完成
**阶段八：AI 服务配置与图片生成** ✅ 已完成
**阶段九：基线与 Prompt 模板系统** ✅ 已完成
**阶段十：课程生成工作流程优化** ✅ 已完成
**阶段十一：管理后台扩展（v2）** ✅ 已完成
**阶段十二：质量与体验打磨** ✅ 已完成
**阶段十三：问 AI 对话模块** ✅ 已完成
**阶段十四：课件生成模块** ✅ 已完成
**阶段十五：课件功能优化（图片 + 后台任务 + 进度）** ✅ 已完成
**阶段十六：课件版式升级（pptx-automizer + 模板）** ✅ 已完成
**阶段十七：管理后台重构（消除硬编码）** ✅ 已完成

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
| 1.8 | 按接入规范 v1 创建课程包目录结构 | ✅ 已完成 | — | 含 lesson.json、package.json、attachments/ |
| 1.9 | 全局样式体系（assets/style.css） | ✅ 已完成 | — | 浅蓝紫雾光科技感 CSS 变量体系 |

---

### 阶段二：迁移至 Next.js 框架

| # | 任务 | 状态 | 方案文档 | 备注 |
|---|------|------|----------|------|
| 2.0 | 技术选型讨论与确认 | ✅ 已完成 | [ADR-001](decisions/ADR-001-nextjs-migration.md) | Next.js + Prisma；样式后来从 Tailwind 改为纯 CSS |
| 2.1 | 制定完整迁移实现方案 | ✅ 已完成 | [迁移方案](tech/architecture/nextjs-migration-plan.md) | 6个Phase，已确认 |
| **Phase 1** | **项目初始化与基础配置** | ✅ 已完成 | — | — |
| 2.2 | create-next-app 初始化项目 | ✅ 已完成 | — | TypeScript + App Router |
| 2.3 | CSS 变量映射进主题 | ✅ 已完成 | — | globals.css |
| 2.4 | 全局组件：Sidebar、TopBar、RootLayout | ✅ 已完成 | — | components/Sidebar.tsx、TopBar.tsx |
| **Phase 2** | **数据库 Schema 设计** | ✅ 已完成 | — | — |
| 2.5 | Prisma Schema 设计（4张表） | ✅ 已完成 | — | User/CoursePackage/Lesson/Attachment |
| 2.6 | Schema 文档 | ✅ 已完成 | [schema.md](tech/database/schema.md) | 初始 4 张表（后续已扩展至 20 张） |
| 2.7 | 本地数据库开发环境配置 | ✅ 已完成 | — | 后迁移至 MySQL |
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
| 2.20 | 管理员后台接入真实操作 | ✅ 已完成 | — | 在阶段五中实现 |
| **Phase 6** | **验收** | ✅ 已完成 | — | — |
| 2.21 | 对照验收清单逐项核验 | ✅ 已完成 | — | 全部 14 项通过 |

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

### 阶段四：单课页体验优化

> 依据：用户需求讨论（2026-03-14），决策见 [ADR-002](decisions/ADR-002-lesson-iframe-approach.md)（已被 ADR-003 取代）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 4.1 | 修复布局 bug（`<br>` 导致 CSS Grid 错列） | ✅ 已完成 | 移除游离 `<br>` 标签 |
| 4.2 | 目录导航升级（IntersectionObserver 高亮） | ✅ 已完成 | 含附件子菜单折叠展开、平滑滚动 |
| 4.3 | 系统导航集成（iframe → 后改为 LessonRenderer） | ✅ 已完成 | 最终方案见 [ADR-003](decisions/ADR-003-content-spec-v2-lessonrenderer.md) |
| 4.4 | AI 模板一键复制按钮 | ✅ 已完成 | clipboard + execCommand 降级 |
| 4.5 | 打印样式优化（`@media print`） | ✅ 已完成 | 隐藏导航，单列白底 |
| 4.6 | 顶部阅读进度条 | ✅ 已完成 | requestAnimationFrame 节流 |

---

### 阶段五：管理员模块（v1）

> 需求文档：[admin-module-requirements.md](product/admin-module-requirements.md)（v1，课程包管理 + 用户管理）
> 开发计划：[admin-module-dev-plan.md](tech/admin-module-dev-plan.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| **Phase 1** | **数据库变更** | ✅ 已完成 | — |
| 5.1 | Lesson 表增加 `@@unique([packageId, lessonNo])` 约束 | ✅ 已完成 | 迁移文件已创建 |
| **Phase 2** | **课程包上传 API** | ✅ 已完成 | — |
| 5.2 | 安装 adm-zip 依赖 | ✅ 已完成 | — |
| 5.3 | `POST /api/admin/upload` — zip 解压 + upsert | ✅ 已完成 | 含路径穿越防护、事务回滚 |
| **Phase 3** | **后台页面重构** | ✅ 已完成 | — |
| 5.4 | Sidebar 补充 admin variant 菜单 | ✅ 已完成 | 含 adminSection active 状态 |
| 5.5 | `/admin/page.tsx` 改为 redirect | ✅ 已完成 | — |
| 5.6 | `/admin/packages/page.tsx` + `AdminPackageList` + `UploadModal` | ✅ 已完成 | — |
| 5.7 | `/admin/users/page.tsx` + `AdminUserList` + `UserFormModal` | ✅ 已完成 | — |
| **Phase 4** | **用户管理 API** | ✅ 已完成 | — |
| 5.8 | `GET/POST /api/admin/users` | ✅ 已完成 | — |
| 5.9 | `PATCH/DELETE /api/admin/users/[id]` | ✅ 已完成 | 含密码重置、禁删自身 |

---

### 阶段六：内容接入规范 v2 + 前端重构（2026-03-14 ~ 03-15）

> 决策文档：[ADR-003](decisions/ADR-003-content-spec-v2-lessonrenderer.md)
> 接入规范：[content-integration-spec-v2.md](product/content-integration-spec-v2.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 6.1 | 实现 v2 内容接入规范 — 结构化 JSON + LessonRenderer | ✅ 已完成 | Lesson.contentData 存 JSON，LessonRenderer 服务端渲染 |
| 6.2 | 移除 v1 兼容层，系统仅支持 v2 课程包 | ✅ 已完成 | iframe 方案完全废弃 |
| 6.3 | 课次可访问性判断统一为 `isLessonAccessible` | ✅ 已完成 | 同时检查 contentData（v2） |
| 6.4 | 前端全面重构 — 纯 CSS 设计系统 + 导航架构 | ✅ 已完成 | Tailwind 完全移除，改为 BEM-lite 纯 CSS |
| 6.5 | TopBar 统一改造 — 页面标题注入 + 返回导航 | ✅ 已完成 | TopBarProvider + SetTopBar 模式 |
| 6.6 | 课程包分发链路修复 + Nginx 配置优化 | ✅ 已完成 | client_max_body_size 60m、SSL 配置保护 |

---

### 阶段七：课程研发模块（2026-03-16）

> PRD：[course-rnd-module-prd.md](product/course-rnd-module-prd.md)
> 实施方案：[course-rnd-module-implementation-plan.md](tech/course-rnd-module-implementation-plan.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| **Phase 0** | **数据库 Schema** | ✅ 已完成 | — |
| 7.1 | 新增 6 张课程研发表 | ✅ 已完成 | Project/DirectionVersion/PlanVersion/LessonDraft/AiCallLog/PublishRecord |
| 7.2 | 新增 2 张 AI 配置表 | ✅ 已完成 | AiProvider（加密 Key）/ AiActionConfig（动作→模型映射） |
| **Phase 1** | **AI 服务层** | ✅ 已完成 | — |
| 7.3 | Provider 工厂 + OpenAI 兼容 chat 方法 | ✅ 已完成 | lib/ai/provider.ts |
| 7.4 | 价格自动获取 + 汇率 + DB 费用计算 | ✅ 已完成 | lib/ai/pricing-service.ts |
| 7.5 | AES-256-GCM 加密 API Key | ✅ 已完成 | lib/crypto.ts |
| **Phase 2** | **方向确认页** | ✅ 已完成 | — |
| 7.6 | 研发进度看板（手风琴布局） | ✅ 已完成 | /course-rnd — 进行中/已定稿/已结束 |
| 7.7 | 方向确认页 + 框架生成（SSE 流式） | ✅ 已完成 | /course-rnd/[projectId] |
| 7.8 | 框架修订（增量合并） | ✅ 已完成 | AI 只输出变更字段，系统 merge |
| **Phase 3** | **工作台** | ✅ 已完成 | — |
| 7.9 | 逐课生成 + 分页加载 | ✅ 已完成 | /course-rnd/[projectId]/workbench |
| 7.10 | 课次修订 + 批量反馈提交 | ✅ 已完成 | — |
| 7.11 | AI 审核（10 项基线校验，SSE 流式报告） | ✅ 已完成 | — |
| **Phase 4** | **定稿与发布** | ✅ 已完成 | — |
| 7.12 | 定稿 + 撤回定稿 | ✅ 已完成 | 含课次完整性检查 |
| 7.13 | 一键发布到课程库 | ✅ 已完成 | 自动填充元信息 + slug 生成 |
| **Phase 5** | **权限与导航** | ✅ 已完成 | — |
| 7.14 | Sidebar 新增课程研发入口（rd_manager + admin） | ✅ 已完成 | — |
| 7.15 | 权限矩阵扩展（三角色） | ✅ 已完成 | lib/permissions.ts |
| **Phase 6** | **成本追踪** | ✅ 已完成 | — |
| 7.16 | 每次 AI 调用记录 CourseRndAiCallLog | ✅ 已完成 | 含 token 数 + 预估费用 |
| 7.17 | 费用面板（工作台内嵌） | ✅ 已完成 | — |

---

### 阶段八：AI 服务配置与图片生成（2026-03-16 ~ 03-17）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| **AI 服务配置页** | | | |
| 8.1 | 提供商管理（增删改 + 加密 Key + 连接测试） | ✅ 已完成 | /admin/ai-settings |
| 8.2 | 动作→模型映射配置 | ✅ 已完成 | 6 个文本动作 + 图片动作 |
| 8.3 | 价格自动获取（OpenRouter API） | ✅ 已完成 | — |
| 8.4 | 模型搜索选择器（Combobox） | ✅ 已完成 | 按 output_modalities 过滤 |
| 8.5 | SOCKS5/HTTP 代理支持（按提供商配置） | ✅ 已完成 | socks-proxy-agent + node:https |
| 8.6 | 兼容火山引擎等非标准 modalities 格式 | ✅ 已完成 | — |
| **图片生成** | | | |
| 8.7 | generateImage — Gemini + DALL-E 双模式 | ✅ 已完成 | 优先 chat 接口，回退 /images/generations |
| 8.8 | GPT-5-image 返回格式适配（message.images） | ✅ 已完成 | — |
| 8.9 | 课程包封面生成 + 课次 hero 图生成 | ✅ 已完成 | 并行生成，单张失败独立处理 |
| 8.10 | 单张图片重新生成 + 封面重新生成弹窗 | ✅ 已完成 | CoverRegenerateModal 共享组件 |
| 8.11 | 图片尺寸自适应（失败自动尝试更大尺寸） | ✅ 已完成 | 默认 1792x1024（16:9） |
| 8.12 | hero 图构图引导 Preset（安全裁切区） | ✅ 已完成 | — |
| 8.13 | 图片模型按次计费 + 手动价格输入（含币种选择） | ✅ 已完成 | — |
| 8.14 | 图片存储移至部署目录外（防 rsync --delete） | ✅ 已完成 | — |

---

### 阶段九：基线与 Prompt 模板系统（2026-03-17）

> PRD：[baseline-prompt-config-prd.md](product/baseline-prompt-config-prd.md)
> 实施方案：[baseline-prompt-template-implementation-plan.md](tech/baseline-prompt-template-implementation-plan.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| **数据库** | | | |
| 9.1 | 新增 5 张表（BaselineDoc/Version + PromptTemplate/Version + Preset） | ✅ 已完成 | — |
| **基线系统** | | | |
| 9.2 | 23 条基线按维度拆分（通用/年龄/难度/组织/产出/矩阵） | ✅ 已完成 | docs/baseline/ |
| 9.3 | assembleBaselines — 按项目属性自动拼装匹配维度 | ✅ 已完成 | 60s 缓存，节省 ~60% token |
| 9.4 | 基线管理页（编辑器 + 版本历史 + 逐行 diff + 回滚） | ✅ 已完成 | /admin/prompt-config |
| **Prompt 模板** | | | |
| 9.5 | 6 个动作模板 + 28 个预定义变量 | ✅ 已完成 | lib/ai/template-engine.ts |
| 9.6 | getSystemPrompt() — DB 优先 + 硬编码兜底 | ✅ 已完成 | 零行为变化保障 |
| 9.7 | 模板编辑器 + 变量插入提示 + 版本管理 | ✅ 已完成 | — |
| **预设系统** | | | |
| 9.8 | 34 个预设（课程方向/图片风格/标签） | ✅ 已完成 | — |
| 9.9 | 预设管理页（左右布局 + 拖拽排序） | ✅ 已完成 | 排序死锁已修复（锁序一致 + 防抖） |
| **种子数据** | | | |
| 9.10 | seed-baselines.ts — 幂等导入基线 + 模板 + 预设 | ✅ 已完成 | 只创建不覆盖 |
| **权限** | | | |
| 9.11 | teacher/rd_manager 只读访问 AI 设置和 Prompt 配置 | ✅ 已完成 | — |

---

### 阶段十：课程生成工作流程优化（2026-03-17 ~ 03-18）

> 实施方案：[course-workflow-optimization-plan.md](tech/course-workflow-optimization-plan.md)
> 上下文分析：[course-generation-context-flow.md](tech/course-generation-context-flow.md)
> 经验总结：[ADR-004](decisions/ADR-004-aigc-prompt-engineering-lessons.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| **AI 上下文修复** | | | |
| 10.1 | 详细方案注入 overview + summary | ✅ 已完成 | 高优先级 |
| 10.2 | 补全 coreNeeds/constraints/orgForm/deliverableType | ✅ 已完成 | — |
| 10.3 | 课次间内容引用（前 N-1 课摘要） | ✅ 已完成 | — |
| 10.4 | 所有图片路由注入 imageStylePrompt | ✅ 已完成 | — |
| **交互增强** | | | |
| 10.5 | 框架修订 + 封面移至框架阶段 | ✅ 已完成 | 仅首次无封面时自动生成 |
| 10.6 | 看板布局：三列 → 竖向手风琴 | ✅ 已完成 | — |
| 10.7 | 修改意见暂存 + 批量提交 | ✅ 已完成 | Portal 固定反馈栏 |
| 10.8 | AI 审核报告 SSE 流式传输 | ✅ 已完成 | 逐项推送检查结果 |
| **流式生成体验** | | | |
| 10.9 | 课次生成真实流式进度（替代假进度条） | ✅ 已完成 | 真实板块检测 |
| 10.10 | 流式生成时实时展示 AI 输出文本 | ✅ 已完成 | — |
| 10.11 | 确认框架时自动创建方案骨架 | ✅ 已完成 | 工作台直接展示空课次卡片 |
| **发布体验** | | | |
| 10.12 | 发布表单自动预填 | ✅ 已完成 | — |
| 10.13 | 标签点击自动带入详细提示词 | ✅ 已完成 | — |
| 10.14 | 图片修改 prompt 不再累积历史反馈 | ✅ 已完成 | — |

---

### 阶段十一：管理后台扩展（v2）（2026-03-18）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 11.1 | 操作日志系统（OperationLog） | ✅ 已完成 | /admin/operation-logs，按用户/模块/动作筛选 |
| 11.2 | AI 调用审计日志页面 | ✅ 已完成 | /admin/ai-logs，含完整 prompt 快照查看 |
| 11.3 | AI 用量统计 API 开放给所有角色 | ✅ 已完成 | — |
| 11.4 | 年龄段标签动态化（从基线读取） | ✅ 已完成 | — |
| 11.5 | 课程包编辑功能 | ✅ 已完成 | — |
| 11.6 | Prompt 配置页 UI/UX 优化 | ✅ 已完成 | — |
| 11.7 | 预设管理改为左右布局，与基线管理视觉统一 | ✅ 已完成 | — |

---

### 阶段十二：质量与体验打磨（2026-03-18）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 12.1 | 测试覆盖率从 16% 提升至 94% | ✅ 已完成 | 474 个测试全部通过 |
| 12.2 | 登录页改版 — 单栏居中布局 + Logo 更新 | ✅ 已完成 | — |
| 12.3 | Sidebar 宽度扩展 + 筛选树层级优化 | ✅ 已完成 | 基线完整标签显示 |
| 12.4 | 课程立项界面分组分区 + AI 生成课程名称 | ✅ 已完成 | — |
| 12.5 | 工作台性能优化 — 分页加载 + useMemo + 稳定引用 | ✅ 已完成 | — |
| 12.6 | 预设排序死锁修复 — 后端锁序一致 + 前端防抖 | ✅ 已完成 | — |
| 12.7 | CSS 变量统一（--red → --danger） | ✅ 已完成 | — |
| 12.8 | 危险按钮样式分层（页面 danger / 弹窗 danger-fill） | ✅ 已完成 | — |

---

### 阶段十三：问 AI 对话模块（2026-03-19）

> 技术方案：[chat-module-implementation-plan.md](tech/chat-module-implementation-plan.md)
> PRD：[chat-module-prd.md](product/chat-module-prd.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 13.1 | 多轮对话 + SSE 流式输出 | ✅ 已完成 | 流式打字效果 + 脉动蓝点指示 |
| 13.2 | 对话历史持久化 + 标题自动生成 | ✅ 已完成 | 首轮对话后 AI 自动生成标题 |
| 13.3 | Markdown 富文本渲染 | ✅ 已完成 | react-markdown + remark-gfm |
| 13.4 | 通用模式 / 课程设计模式切换 | ✅ 已完成 | 课程设计模式注入通用基线 + 矩阵 |
| 13.5 | 对话管理（创建/删除/列表） | ✅ 已完成 | 双击确认删除 |
| 13.6 | AI 回复一键复制 | ✅ 已完成 | — |
| 13.7 | 费用追踪（复用 AiCallLog） | ✅ 已完成 | pageKey="chat" |
| 13.8 | 测试覆盖 | ✅ 已完成 | 11 个测试用例 |

---

### 阶段十四：课件生成模块（2026-03-27）

> 技术方案：[slideshow-generation-plan.md](tech/slideshow-generation-plan.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| **Phase 0** | **数据库 + 依赖** | ✅ 已完成 | — |
| 14.1 | 新增 SlideshowDraft 模型 + migration | ✅ 已完成 | per user per lesson 唯一 |
| 14.2 | 安装 pptxgenjs | ✅ 已完成 | 纯 Node.js PPT 生成库 |
| **Phase 1** | **Prompt/基线/预设种子数据** | ✅ 已完成 | — |
| 14.3 | 课件生成通用基线（slideshow_general） | ✅ 已完成 | 语言风格 + 排版原则 + 页面节奏 |
| 14.4 | generate_slideshow Prompt 模板 | ✅ 已完成 | 5 种页面类型 + JSON 输出格式 |
| 14.5 | 4 套 PPT 主题预设（slideshow_theme） | ✅ 已完成 | 科技蓝/自然绿/创意橙/简约白 |
| **Phase 2** | **AI 转写服务层** | ✅ 已完成 | — |
| 14.6 | template-engine 扩展课件变量 | ✅ 已完成 | 课件基线 + 课次完整内容 + 主题配置 |
| 14.7 | 课件生成核心逻辑 | ✅ 已完成 | lib/slideshow/generate.ts |
| **Phase 3** | **PPT 组装服务** | ✅ 已完成 | — |
| 14.8 | pptx-builder（5 种页面类型 + 主题） | ✅ 已完成 | lib/slideshow/pptx-builder.ts |
| **Phase 4** | **API 路由** | ✅ 已完成 | — |
| 14.9 | POST /api/slideshow/generate | ✅ 已完成 | AI 转写 + 持久化 + 费用记录 |
| 14.10 | GET /api/slideshow/download | ✅ 已完成 | 从已有 JSON 组装 .pptx |
| 14.11 | GET /api/slideshow/status | ✅ 已完成 | 课次课件状态查询 |
| 14.12 | GET /api/slideshow/download-all | ✅ 已完成 | zip 打包批量下载 |
| **Phase 5** | **前端页面** | ✅ 已完成 | — |
| 14.13 | 课程包选择页 /slideshow | ✅ 已完成 | 已发布课程包卡片 |
| 14.14 | 课次列表页 /slideshow/[slug] | ✅ 已完成 | 主题选择 + 生成/下载/重新生成 |
| 14.15 | 一键生成全部 + 下载全部 | ✅ 已完成 | 逐课次串行 + zip 打包 |
| **Phase 6** | **集成** | ✅ 已完成 | — |
| 14.16 | Sidebar 入口 + 权限矩阵 | ✅ 已完成 | 三角色均可用 |
| 14.17 | 使用指南更新 | ✅ 已完成 | TeacherGuide + RdManagerGuide |
| **Phase 7** | **测试** | ✅ 已完成 | — |
| 14.18 | API + lib 测试 | ✅ 已完成 | 21 个测试用例，81 套件 617 测试全通过 |

---

### 阶段十五：课件功能优化（2026-03-27）

> 技术方案：[slideshow-optimization-plan.md](tech/slideshow-optimization-plan.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 15.1 | SlideshowDraft 新增 status/progress/errorMessage | ✅ 已完成 | 后台任务状态追踪 |
| 15.2 | 课件基线图片判断指引 + Prompt 模板 imagePrompt 规范 | ✅ 已完成 | — |
| 15.3 | 后台任务模式（triggerGeneration + executeGeneration） | ✅ 已完成 | 关闭页面不中断 |
| 15.4 | 图片处理模块（复用 hero 图 + AI 生成） | ✅ 已完成 | image-processor.ts |
| 15.5 | API 改造（POST 触发即返 + status 进度 + download 状态校验） | ✅ 已完成 | — |
| 15.6 | 前端轮询进度（4 种状态 + 2 秒轮询） | ✅ 已完成 | — |
| 15.7 | PPT builder 支持图片插入 | ✅ 已完成 | — |
| 15.8 | 测试覆盖 | ✅ 已完成 | 82 套件 621 测试 |

---

### 阶段十六：课件版式升级（2026-03-27）

> 技术方案：[slideshow-layout-upgrade-plan.md](tech/slideshow-layout-upgrade-plan.md)

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 16.1 | 安装 pptx-automizer + 4 套模板 + manifest.json | ✅ 已完成 | templates/slideshow/ |
| 16.2 | 32 个版式组件注册（slideshow_layout Preset） | ✅ 已完成 | 4 主题 × 8 版式 |
| 16.3 | Slide 新增 layout 字段 + Prompt 注入版式列表 | ✅ 已完成 | AI 自主选版式 |
| 16.4 | pptx-builder 重写为 pptx-automizer 模板组装 | ✅ 已完成 | 替代 pptxgenjs 渲染 |
| 16.5 | 图片尺寸按版式方向优化 | ✅ 已完成 | landscape/portrait/square |
| 16.6 | CC BY 4.0 署名 + 使用指南更新 | ✅ 已完成 | SlidesCarnival |
| 16.7 | 测试覆盖 | ✅ 已完成 | 82 套件 621 测试 |

---

### 阶段十七：管理后台重构（2026-03-27）

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| 17.1 | CLAUDE.md 追加 AIGC 功能上线检查清单 | ✅ 已完成 | — |
| 17.2 | BaselineManager 分组逻辑改为数据驱动 | ✅ 已完成 | 新类型无需改前端 |
| 17.3 | 新增 ai_action_registry 动作注册表 Preset | ✅ 已完成 | 12 个动作 |
| 17.4 | 新增动作注册表 API | ✅ 已完成 | GET /api/admin/ai-actions/registry |
| 17.5 | AiSettingsPage 改为从 API 加载动作列表 | ✅ 已完成 | 删除 DEFAULT_ACTIONS |
| 17.6 | 测试覆盖 | ✅ 已完成 | 5 个新测试 |

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
| **决策记录** | |
| ADR-001 技术选型（Next.js 迁移） | `docs/decisions/ADR-001-nextjs-migration.md` |
| ADR-002 单课页 iframe 方案（已取代） | `docs/decisions/ADR-002-lesson-iframe-approach.md` |
| ADR-003 内容规范 v2 + LessonRenderer | `docs/decisions/ADR-003-content-spec-v2-lessonrenderer.md` |
| ADR-004 AIGC 工程化经验总结 | `docs/decisions/ADR-004-aigc-prompt-engineering-lessons.md` |
| ADR-005 火山引擎方舟 API 集成 | `docs/decisions/ADR-005-volcengine-ark-api-integration.md` |
| ADR-006 阿里云百炼 API 集成 | `docs/decisions/ADR-006-alibaba-bailian-api-integration.md` |
| ADR-007 智谱 AI API 集成 | `docs/decisions/ADR-007-zhipu-bigmodel-api-integration.md` |
| ADR-008 DeepSeek API 集成 | `docs/decisions/ADR-008-deepseek-api-integration.md` |
| ADR-009 月之暗面 API 集成 | `docs/decisions/ADR-009-moonshot-kimi-api-integration.md` |
| ADR-010 百度文心 API 集成 | `docs/decisions/ADR-010-baidu-wenxin-api-integration.md` |
| ADR-011 腾讯混元 API 集成 | `docs/decisions/ADR-011-tencent-hunyuan-api-integration.md` |
| ADR-012 MiniMax API 集成 | `docs/decisions/ADR-012-minimax-api-integration.md` |
| ADR-013 OpenAI API 集成 | `docs/decisions/ADR-013-openai-api-integration.md` |
| ADR-014 Google Gemini API 集成 | `docs/decisions/ADR-014-google-gemini-api-integration.md` |
| ADR-015 Anthropic Claude API 集成 | `docs/decisions/ADR-015-anthropic-claude-api-integration.md` |
| ADR-016 OpenRouter 聚合网关集成 | `docs/decisions/ADR-016-openrouter-api-integration.md` |
| ADR-017 硅基流动 SiliconFlow 集成 | `docs/decisions/ADR-017-siliconflow-api-integration.md` |
| ADR-018 讯飞星火 iFlytek Spark 集成 | `docs/decisions/ADR-018-iflytek-spark-api-integration.md` |
| ADR-019 阶跃星辰 StepFun 集成 | `docs/decisions/ADR-019-stepfun-api-integration.md` |
| ADR-020 xAI Grok 集成 | `docs/decisions/ADR-020-xai-grok-api-integration.md` |
| ADR-021 Mistral AI 集成 | `docs/decisions/ADR-021-mistral-ai-api-integration.md` |
| ADR-022 Groq 集成 | `docs/decisions/ADR-022-groq-api-integration.md` |
| **产品需求** | |
| 教师授课系统 PRD | `docs/product/teacher-system-prd.md` |
| 接入规范 v2 | `docs/product/content-integration-spec-v2.md` |
| 课程研发模块 PRD | `docs/product/course-rnd-module-prd.md` |
| 问 AI 对话模块 PRD | `docs/product/chat-module-prd.md` |
| 基线与 Prompt 配置 PRD | `docs/product/baseline-prompt-config-prd.md` |
| 管理员模块需求（v1） | `docs/product/admin-module-requirements.md` |
| 管理员模块需求（v2 扩展） | `docs/product/admin-module-requirements-v2.md` |
| 文档符合性修复计划 | `docs/product/doc-compliance-fixes.md` |
| **技术方案** | |
| Next.js 迁移方案 | `docs/tech/architecture/nextjs-migration-plan.md` |
| 数据库设计（21 个模型） | `docs/tech/database/schema.md` |
| 管理员模块开发计划（v1） | `docs/tech/admin-module-dev-plan.md` |
| 课程研发模块实施方案 | `docs/tech/course-rnd-module-implementation-plan.md` |
| 基线与 Prompt 实施方案 | `docs/tech/baseline-prompt-template-implementation-plan.md` |
| 课程生成上下文逻辑 | `docs/tech/course-generation-context-flow.md` |
| 工作流程优化方案 | `docs/tech/course-workflow-optimization-plan.md` |
| 问 AI 模块技术方案 | `docs/tech/chat-module-implementation-plan.md` |
| API 总览（53 个路由） | `docs/tech/api/overview.md` |
| **运维** | |
| VPS 部署方案 | `docs/ops/vps-migration-guide.md` |
| **设计** | |
| 视觉设计规范 | `docs/design/guidelines/claude_teacher_visual_handoff/` |
| **基线文档** | |
| 基线总目录 | `docs/baseline/规则文档总目录清单_v1.md` |
| 课程设计共用基线 v3 | `docs/baseline/AI生成课程系统共用基线_课程设计原则与生成约束_v3.md` |
| **使用手册** | |
| 教师使用手册 | `docs/user-guide/teacher-guide.md` |
| 教学主管使用手册 | `docs/user-guide/rd-manager-guide.md` |
| 管理员使用手册 | `docs/user-guide/admin-guide.md` |
| 教师快速入门（HTML） | `docs/user-guide/html/teacher-quickstart.html` |
| 教学主管快速入门（HTML） | `docs/user-guide/html/rd-manager-quickstart.html` |
