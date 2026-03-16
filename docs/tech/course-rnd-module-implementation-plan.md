# 课程研发模块 — 实施方案

> 版本：v1.0
> 日期：2026-03-16
> 状态：已确认
> 基于：`AI-Dash_课程研发模块交接包`（ChatGPT 输出）+ 5 个决策点讨论确认

---

## 1. 模块定位

"课程研发"是 AI Dash 教师授课系统的新增功能模块，面向**教学主管（rd_manager）**使用，嵌入现有系统的 Sidebar + TopBar + 认证体系中。

目标：帮助教学主管完成两步工作：
1. **课程方向确认**：输入课程信息，由 AI 生成课程框架
2. **课程详细方案打磨**：基于框架生成逐节详细方案，逐节审阅修改直到定稿，一键发布到课程库

---

## 2. 决策记录

### 2.1 AI 服务（决策点 1）

**方案**：OpenRouter 统一网关

- 1 个 API key 访问所有主流模型
- 按动作类型配置不同模型（`config/ai-models.json`）
- 接口兼容 OpenAI SDK（仅 baseURL 不同）
- v1 只需 1 个 Provider 文件

**配置文件** `config/ai-models.json`：

```json
{
  "currency": "CNY",
  "usdToCny": { "value": 7.24, "source": "auto", "updatedAt": "2026-03-16" },
  "models": {
    "anthropic/claude-sonnet-4-20250514": {
      "inputPrice":  { "value": 3.0,  "source": "auto" },
      "outputPrice": { "value": 15.0, "source": "auto" }
    },
    "openai/gpt-4o": {
      "inputPrice":  { "value": 2.5,  "source": "auto" },
      "outputPrice": { "value": 10.0, "source": "auto" }
    },
    "openai/gpt-4o-mini": {
      "inputPrice":  { "value": 0.15, "source": "auto" },
      "outputPrice": { "value": 0.6,  "source": "auto" }
    }
  },
  "actions": {
    "generate_framework":       "anthropic/claude-sonnet-4-20250514",
    "revise_framework":         "openai/gpt-4o-mini",
    "optimize_framework_field": "openai/gpt-4o-mini",
    "generate_plan":            "anthropic/claude-sonnet-4-20250514",
    "regenerate_lesson":        "anthropic/claude-sonnet-4-20250514",
    "revise_lesson":            "openai/gpt-4o",
    "rewrite_field":            "openai/gpt-4o-mini",
    "revise_adjacent":          "openai/gpt-4o",
    "rewrite_teaching_talk":    "openai/gpt-4o-mini"
  }
}
```

**价格/汇率更新**：

| 方式 | 触发 | 覆盖范围 |
|------|------|---------|
| 自动更新 | 每日定时 | 只更新 `source: "auto"` 的值 |
| 手动刷新 | 点击「立即更新」 | 覆盖全部（包括手动编辑的） |
| 手动编辑 | 管理页面修改 | 标记为 `source: "manual"`，自动更新不覆盖 |

数据来源：
- 模型价格：OpenRouter API（`GET /api/v1/models`）
- 汇率：exchangerate-api（`GET /v4/latest/USD`）

**费用计算**：
```
费用(¥) = (inputTokens × inputPrice + outputTokens × outputPrice) / 1,000,000 × usdToCny
```

### 2.2 数据模型（决策点 2）

**v1 共新增 7 张表**：

| 表 | 用途 |
|---|------|
| `CourseRndProject` | 研发项目主体 |
| `CourseRndDirectionVersion` | 方向版本（第一页生成结果） |
| `CourseRndPlanVersion` | 方案版本（第二页整套方案） |
| `CourseRndLessonDraft` | 单课草稿（含 `lastFeedback` 字段替代 Issue 表） |
| `CourseRndAiCallLog` | AI 调用日志（含 `estimatedCost` 人民币费用） |
| `CourseRndPublishRecord` | 发布记录（支持多次发布、不同课程包、回滚） |
| `OperationLog` | 操作日志（课程包管理 + 用户管理全量记录） |

暂缓的表：
- `CourseRndIssue` → 用 `LessonDraft.lastFeedback` 替代

**AI 费用面板（教学主管可见）**：

- 第一层：项目级汇总（总调用次数 + 预估费用 ¥）
- 第二层：按动作类型汇总（次数、模型、token、费用）
- 第三层：明细记录（时间、动作、课次、模型、token、费用）

### 2.3 v2 contentData（决策点 3）

**无映射步骤**。AI 在生成详细方案阶段直接输出 v2 规范的完整 `contentData`（hero + 7 个 sections + 所有 block 类型）。

- Prompt 直接引用 `docs/product/content-integration-spec-v2.md` 规范文档
- 规范升级时只需更新文档，AI 输出自动同步
- 发布时 contentData 已就绪，直接入库

### 2.4 权限（决策点 4）

**新增角色**：`rd_manager`（教学主管/研发员）

角色权限矩阵：

| 功能 | teacher | rd_manager | admin |
|------|---------|------------|-------|
| 课程包列表/详情/课次 | ✅ | ✅ | ✅ |
| 课程研发模块 | ❌ | ✅ | ✅ |
| 管理后台 — 课程包管理 | ❌ | ✅ | ✅ |
| 管理后台 — 用户管理 | ❌ | ❌ | ✅ |
| 操作日志 — 查看范围 | — | 仅自己 | 全部 |

### 2.5 实施顺序（决策点 5）

分 7 个阶段，每阶段人工验收通过后才进入下一阶段。

---

## 3. 数据模型详细设计

### 3.1 CourseRndProject

```prisma
model CourseRndProject {
  id                 String   @id @default(cuid())
  title              String
  status             String   @default("direction") // direction | workbench | finalized | paused | archived
  targetAudience     String?
  courseDirection     String?
  ageRange           String?
  level              String?
  lessonCount        Int?
  coreDeliverable    String?
  roughFramework     String?  @db.LongText
  coreNeeds          String?  @db.LongText
  constraints        String?  @db.LongText

  currentDirectionVersionId String?
  currentPlanVersionId      String?

  createdById        String
  createdBy          User     @relation(fields: [createdById], references: [id], onDelete: Cascade)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  directionVersions  CourseRndDirectionVersion[]
  planVersions       CourseRndPlanVersion[]
  publishRecords     CourseRndPublishRecord[]
}
```

### 3.2 CourseRndDirectionVersion

```prisma
model CourseRndDirectionVersion {
  id              String   @id @default(cuid())
  projectId       String
  project         CourseRndProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  summary         String?  @db.LongText
  frameworkJson   String?  @db.LongText // JSON: [{lessonNo, title, overview}]
  versionNo       Int
  isSelected      Boolean  @default(false)

  promptSnapshot  String?  @db.LongText
  modelName       String?
  inputTokens     Int?
  outputTokens    Int?

  createdAt       DateTime @default(now())
}
```

### 3.3 CourseRndPlanVersion

```prisma
model CourseRndPlanVersion {
  id              String   @id @default(cuid())
  projectId       String
  project         CourseRndProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  versionNo       Int
  isSelected      Boolean  @default(false)
  planJson        String   @db.LongText // 整套方案 JSON
  changeSummary   String?  @db.LongText

  sourceDirectionVersionId String?
  modelName       String?
  inputTokens     Int?
  outputTokens    Int?

  createdAt       DateTime @default(now())
  lessonDrafts    CourseRndLessonDraft[]
}
```

### 3.4 CourseRndLessonDraft

```prisma
model CourseRndLessonDraft {
  id              String   @id @default(cuid())
  planVersionId   String
  planVersion     CourseRndPlanVersion @relation(fields: [planVersionId], references: [id], onDelete: Cascade)

  lessonNo        Int
  title           String
  contentData     String?  @db.LongText // v2 完整 JSON（hero + sections）
  lastFeedback    String?  @db.LongText // 最近一次修改意见（替代 Issue 表）
  draftJson       String?  @db.LongText // 兼容未来扩展

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([planVersionId, lessonNo])
}
```

### 3.5 CourseRndAiCallLog

```prisma
model CourseRndAiCallLog {
  id              String   @id @default(cuid())
  projectId       String
  pageKey         String   // direction | workbench
  actionType      String   // generate_framework / generate_plan / revise_lesson / rewrite_field ...
  modelName       String
  inputTokens     Int      @default(0)
  outputTokens    Int      @default(0)
  estimatedCost   Float    @default(0) // 预估费用（人民币）
  cacheHit        Boolean  @default(false)
  userId          String?
  metadataJson    String?  @db.LongText
  createdAt       DateTime @default(now())
}
```

### 3.6 CourseRndPublishRecord

```prisma
model CourseRndPublishRecord {
  id              String   @id @default(cuid())
  projectId       String
  project         CourseRndProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  packageSlug     String
  packageTitle    String
  publishedById   String
  publishedBy     User     @relation(fields: [publishedById], references: [id], onDelete: Cascade)
  resultJson      String?  @db.LongText
  createdAt       DateTime @default(now())
}
```

### 3.7 OperationLog

```prisma
model OperationLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  module     String   // "package" | "user"
  action     String   // "upload" | "publish" | "online" | "offline" | "delete" | "create" | "edit" | "reset_password"
  targetId   String?
  targetName String?
  detail     String?
  createdAt  DateTime @default(now())
}
```

---

## 4. API 设计

### 4.1 项目 CRUD

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/course-rnd/recent` | 最近项目列表 |
| POST | `/api/course-rnd/projects` | 创建项目 |
| GET | `/api/course-rnd/projects/[id]` | 获取项目详情 |
| PATCH | `/api/course-rnd/projects/[id]` | 更新项目（自动保存草稿） |

### 4.2 AI 动作 — 第一页

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/course-rnd/projects/[id]/generate-framework` | 生成课程框架 |
| POST | `/api/course-rnd/projects/[id]/revise-framework` | 按意见调整框架 |
| POST | `/api/course-rnd/projects/[id]/optimize-framework-field` | 优化标题/概述 |

### 4.3 AI 动作 — 第二页

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/course-rnd/projects/[id]/generate-plan` | 生成整套详细方案 |
| POST | `/api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate` | 重新生成本节 |
| POST | `/api/course-rnd/projects/[id]/lessons/[lessonNo]/revise` | 按意见修改本节 |
| POST | `/api/course-rnd/projects/[id]/lessons/[lessonNo]/rewrite-field` | 单字段改写 |
| POST | `/api/course-rnd/projects/[id]/revise-adjacent-lessons` | 联动优化相邻课次 |
| POST | `/api/course-rnd/projects/[id]/lessons/[lessonNo]/rewrite-teaching-talk` | 重写授课表达示例 |

### 4.4 版本与定稿

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/course-rnd/projects/[id]/versions/current` | 获取当前版本 |
| POST | `/api/course-rnd/projects/[id]/save-version` | 保存当前版本 |
| POST | `/api/course-rnd/projects/[id]/finalize` | 确认定稿 |

### 4.5 发布

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/admin/publish` | 一键发布到课程库（JSON 直接入库） |

### 4.6 AI 设置

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/admin/ai-settings` | 获取当前模型/价格/汇率配置 |
| PATCH | `/api/admin/ai-settings` | 手动编辑配置 |
| POST | `/api/admin/ai-settings/refresh` | 手动刷新（覆盖全部） |

### 4.7 操作日志

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/admin/operation-logs` | 获取操作日志（admin 全部，rd_manager 仅自己） |

---

## 5. 页面路由

```
app/(app)/
├── course-rnd/
│   ├── page.tsx                       # /course-rnd → 新建/入口
│   └── [projectId]/
│       ├── page.tsx                   # /course-rnd/:id → 方向确认页
│       └── workbench/page.tsx         # /course-rnd/:id/workbench → 工作台
└── admin/
    ├── ai-settings/page.tsx           # /admin/ai-settings → AI 模型与费用设置
    └── operation-logs/page.tsx        # /admin/operation-logs → 操作日志
```

---

## 6. 风险规避措施

| 措施 | 实现方式 |
|------|---------|
| **Feature Flag** | `ENABLE_RD_MODULE=true/false` 环境变量，控制菜单入口和路由可见性 |
| **Feature Branch** | 在 `feature/rd-module` 分支开发 |
| **权限基础设施** | `lib/roles.ts` + `lib/permissions.ts` + `lib/auth-utils.ts`，替代所有硬编码 |
| **Zod 校验** | `lib/lesson-content-schema.ts`，upload API 和 publish API 共用 |
| **AI 输出校验** | 生成结果必须通过 v2 schema 校验才保存 |
| **AI 超时** | 请求级 90s 超时 + Nginx `proxy_read_timeout 120s` |
| **AI 限额** | 每用户每日 token 上限（可配置） |
| **回滚脚本** | `scripts/rollback-rd-module.sql`（删表 + 降级 rd_manager） |
| **分阶段 migration** | 先建表 → 再改权限 → 最后上 AI |

---

## 7. 分阶段实施计划

### Phase 0：权限基础设施重构

**目标**：重构现有硬编码权限判断，不新增功能

**改动文件**：
- 新建 `lib/roles.ts` — 角色常量
- 新建 `lib/permissions.ts` — 权限矩阵
- 新建 `lib/auth-utils.ts` — `requireRole(roles[])` 统一权限函数
- 修改 `auth.config.ts` — PROTECTED 路由扩展
- 修改 `(app)/admin/layout.tsx` — 引用权限函数
- 修改 6 个 API route — 替换 `requireAdmin()`
- 修改 `Sidebar.tsx` — 角色显示映射
- 修改 `UserAvatarDropdown.tsx` — 角色显示映射
- 修改 `globals.css` — 新增 `.badge-role--rd_manager`

**验收标准**：
- [ ] teacher 账号功能不变
- [ ] admin 账号功能不变
- [ ] 所有测试通过
- [ ] 无硬编码 `role === "admin"` 残留

---

### Phase 1：数据库 + Feature Flag

**目标**：建表 + 功能开关，现有系统零影响

**改动**：
- `schema.prisma` — 新增 7 张表
- `prisma/seed.ts` — 新增 rd_manager 测试账号
- `lib/feature-flags.ts` — `ENABLE_RD_MODULE`
- `.env.example` — 新增环境变量说明

**验收标准**：
- [ ] migration 成功
- [ ] Feature Flag 关闭时系统无任何变化
- [ ] seed 可创建 rd_manager 用户
- [ ] 生产环境部署后现有功能不变

---

### Phase 2：AI 服务层

**目标**：OpenRouter 对接 + prompt 模板 + 校验

**新建文件**：
- `lib/ai/provider.ts` — 统一接口
- `lib/ai/openrouter.ts` — OpenRouter Provider
- `lib/ai/prompts/` — prompt 模板（引用 v2 规范文档）
- `lib/lesson-content-schema.ts` — Zod 校验器
- `config/ai-models.json` — 模型/价格/动作配置

**验收标准**：
- [ ] 测试 prompt 调用 OpenRouter 成功
- [ ] 返回结果通过 v2 Zod 校验
- [ ] 超时机制生效
- [ ] 费用计算正确（人民币）

---

### Phase 3：第一页 — 方向确认

**目标**：完整的第一页功能

**新建**：
- `app/(app)/course-rnd/page.tsx`
- `app/(app)/course-rnd/[projectId]/page.tsx`
- `components/course-rnd/DirectionInputForm.tsx`
- `components/course-rnd/FrameworkResultPanel.tsx`
- `components/course-rnd/DirectionDecisionPanel.tsx`
- 项目 CRUD API + AI 框架生成/调整 API

**Sidebar 修改**：新增"课程研发"菜单项（rd_manager + admin 可见）

**验收标准**：
- [ ] 创建项目 → 填写输入 → 生成框架
- [ ] 调整框架 → 优化标题/概述
- [ ] 暂停/废弃项目
- [ ] 确认框架进入第二页

---

### Phase 4：第二页 — 工作台

**目标**：完整的第二页功能

**新建**：
- `app/(app)/course-rnd/[projectId]/workbench/page.tsx`
- `components/course-rnd/LessonDraftCard.tsx`
- `components/course-rnd/TeachingTalkAccordion.tsx`
- `components/course-rnd/AiCostPanel.tsx`
- 详细方案生成/修改 API

**验收标准**：
- [ ] 生成整套详细方案
- [ ] 局部修改：按意见修改、重新生成、单字段改写
- [ ] AI 费用面板显示正确（¥）
- [ ] 保存版本

---

### Phase 5：定稿 + 一键发布

**目标**：研发闭环 → 发布到课程库

**新建**：
- `components/course-rnd/FinalizePanel.tsx`
- `app/api/admin/publish/route.ts`
- `lib/lesson-content-schema.ts`（Zod 校验，publish + upload 共用）

**验收标准**：
- [ ] 确认定稿
- [ ] 一键发布 → CoursePackage + Lesson 入库
- [ ] 课程包列表可见
- [ ] 进入课次页正常渲染
- [ ] 发布记录写入
- [ ] 重复发布覆盖更新

---

### Phase 6：管理后台增强

**目标**：设置页 + 日志页 + 权限分级

**新建**：
- `app/(app)/admin/ai-settings/page.tsx`
- `app/(app)/admin/operation-logs/page.tsx`
- `app/api/admin/ai-settings/route.ts`
- `app/api/admin/operation-logs/route.ts`
- `(app)/admin/users/layout.tsx` — users 仅 admin 可访问

**修改**：
- 现有 admin API 中写入 OperationLog

**验收标准**：
- [ ] AI 设置页：查看/编辑模型价格、汇率、动作映射
- [ ] 手动刷新覆盖全部
- [ ] 操作日志页：admin 看全部，rd_manager 看自己
- [ ] rd_manager 能访问课程包管理，不能访问用户管理

---

## 8. 环境变量新增

```env
# Feature Flag
ENABLE_RD_MODULE=false

# OpenRouter
OPENROUTER_API_KEY=sk-or-xxx

# AI 配置文件路径（可选，默认 config/ai-models.json）
AI_CONFIG_PATH=config/ai-models.json
```

---

## 9. 相关文档

- 交接包原文：`AI-Dash_课程研发模块交接包/`
- 内容接入规范 v2：`docs/product/content-integration-spec-v2.md`
- 项目交接文档：`docs/tech/chatgpt-handoff-context.md`
- 现有系统架构：`CLAUDE.md`
