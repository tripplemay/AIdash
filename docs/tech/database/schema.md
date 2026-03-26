# 数据库 Schema 设计文档

> 最后更新：2026-03-19
> 对应文件：`app/prisma/schema.prisma`
> 数据库：MySQL（本地 `mysql://root@localhost:3306/aidash_dev`）
> ORM：Prisma 6

---

## 概述

系统共 21 个模型，按功能分为 6 组：

| 分组 | 模型数 | 说明 |
|------|--------|------|
| 核心（教师端） | 4 | 用户、课程包、课次、附件 |
| 课程研发 | 6 | 研发项目、方向版本、方案版本、课次草稿、AI 日志、发布记录 |
| AI 配置 | 2 | 服务提供商、动作映射 |
| 基线与 Prompt | 5 | 基线文档/版本、模板/版本、预设 |
| 系统 | 2 | 操作日志、系统配置 |
| AI 对话 | 2 | 对话、消息 |

---

## ER 关系总览

```
User ─┬── CourseRndProject (1:N)
      ├── CourseRndPublishRecord (1:N)
      ├── OperationLog (1:N)
      └── ChatConversation (1:N)
            └── ChatMessage (1:N)

CoursePackage
  └── Lesson (1:N, Cascade)
        └── Attachment (1:N, Cascade)

CourseRndProject ─┬── CourseRndDirectionVersion (1:N, Cascade)
                  ├── CourseRndPlanVersion (1:N, Cascade)
                  │     └── CourseRndLessonDraft (1:N, Cascade)
                  └── CourseRndPublishRecord (1:N, Cascade)

AiProvider
  └── AiActionConfig (1:N)

BaselineDoc
  └── BaselineDocVersion (1:N, Cascade)

PromptTemplate
  └── PromptTemplateVersion (1:N, Cascade)

SystemConfig（独立，Key-Value）
CourseRndAiCallLog（独立，无外键关联）
```

---

## 一、核心表（教师端）

### User（用户）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| username | String | UNIQUE | 登录账号 |
| password | String | — | bcrypt 哈希密码 |
| name | String | — | 显示名（如"张老师"） |
| role | String | DEFAULT "teacher" | `"teacher"` / `"rd_manager"` / `"admin"` |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**关系**：→ CourseRndProject[] / CourseRndPublishRecord[] / OperationLog[] / ChatConversation[]

---

### CoursePackage（课程包）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| slug | String | UNIQUE | URL 标识符，如 `my-magical-partner` |
| title | String | — | 课程包名称 |
| ageRange | String | — | 适用年龄段，如 `"8-12"` |
| level | String | — | 级别，如 `"L1"` |
| summary | String? | — | 简介 |
| coverImage | String? | — | 主图路径 |
| status | String | DEFAULT "draft" | `"draft"` / `"published"` / `"offline"` |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**关系**：→ Lesson[]（Cascade）

---

### Lesson（课次）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| lessonNo | Int | — | 课次序号 |
| title | String | — | 课次标题 |
| durationMinutes | Int | DEFAULT 45 | 课时时长（分钟） |
| deliveryMode | String | DEFAULT "offline_small_group" | 授课形式 |
| groupSize | String? | — | 人数，如 `"4-6"` |
| aiRoundsCount | Int? | — | AI 回合数 |
| outputSummary | String? | — | 本课成果描述 |
| entryFile | String | DEFAULT "index.html" | 入口文件名 |
| contentPath | String? | — | v1: 单课 HTML 路径（已弃用） |
| contentData | String? | LongText | **v2: 结构化 JSON**（hero + sections） |
| status | String | DEFAULT "draft" | 状态 |
| packageId | String | FK → CoursePackage.id | 所属课程包 |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**约束**：`@@unique([packageId, lessonNo])`
**关系**：→ Attachment[]（Cascade）

---

### Attachment（附件）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| type | String | — | `"teacher_screen"` / `"student_ai_input_template"` / `"student_output_template"` / `"teacher_demo_case"` |
| title | String | — | 显示名称 |
| path | String | — | 文件相对路径 |
| lessonId | String | FK → Lesson.id | 所属课次 |

---

## 二、课程研发表

### CourseRndProject（研发项目）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| title | String | — | 项目名称 |
| status | String | DEFAULT "direction" | `"direction"` / `"workbench"` / `"finalized"` / `"paused"` / `"archived"` |
| targetAudience | String? | — | 目标受众（旧字段） |
| courseDirection | String? | — | 课程方向描述 |
| ageRange | String? | — | 年龄段代码，如 `"A2"` |
| level | String? | — | 难度代码，如 `"L2"` |
| lessonCount | Int? | — | 课次数量 |
| coreDeliverable | String? | — | 核心产出物描述 |
| roughFramework | String? | LongText | 粗略框架 |
| coreNeeds | String? | LongText | 核心需求标签 |
| constraints | String? | LongText | 约束条件标签 |
| orgForm | String? | — | 组织形态 `"S1"` / `"S2"` |
| deliverableType | String? | — | 产出物类型 `"P1"` ~ `"P11"` |
| deliverableName | String? | — | 产出物具体名称 |
| imageStyle | String? | — | 图片风格预设 key |
| imageStylePrompt | String? | Text | 用户可编辑的图片风格描述 |
| currentDirectionVersionId | String? | — | 当前选定的方向版本 |
| currentPlanVersionId | String? | — | 当前选定的方案版本 |
| coverUrl | String? | — | 封面图 URL |
| createdById | String | FK → User.id | 创建人 |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**关系**：→ CourseRndDirectionVersion[] / CourseRndPlanVersion[] / CourseRndPublishRecord[]（均 Cascade）

---

### CourseRndDirectionVersion（方向版本）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| projectId | String | FK → CourseRndProject.id | 所属项目 |
| versionNo | Int | — | 版本号 |
| summary | String? | LongText | 课程总结 |
| frameworkJson | String? | LongText | JSON: `[{lessonNo, title, overview}]` |
| isSelected | Boolean | DEFAULT false | 是否为当前选定版本 |
| promptSnapshot | String? | LongText | 生成时的 prompt 快照 |
| modelName | String? | — | 使用的模型 |
| inputTokens | Int? | — | 输入 token 数 |
| outputTokens | Int? | — | 输出 token 数 |
| createdAt | DateTime | DEFAULT now() | — |

---

### CourseRndPlanVersion（方案版本）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| projectId | String | FK → CourseRndProject.id | 所属项目 |
| versionNo | Int | — | 版本号 |
| isSelected | Boolean | DEFAULT false | 是否选定 |
| planJson | String | LongText | 方案 JSON |
| changeSummary | String? | LongText | 变更摘要 |
| sourceDirectionVersionId | String? | — | 来源方向版本 |
| modelName | String? | — | 模型 |
| inputTokens | Int? | — | 输入 token |
| outputTokens | Int? | — | 输出 token |
| createdAt | DateTime | DEFAULT now() | — |

**关系**：→ CourseRndLessonDraft[]（Cascade）

---

### CourseRndLessonDraft（课次草稿）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| planVersionId | String | FK → CourseRndPlanVersion.id | 所属方案版本 |
| lessonNo | Int | — | 课次序号 |
| title | String | — | 课次标题 |
| overview | String? | Text | 课次概述 |
| contentData | String? | LongText | v2 完整 JSON（hero + sections） |
| draftJson | String? | LongText | AI 原始输出（AiLessonOutput） |
| lastFeedback | String? | LongText | 上次修改意见 |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**约束**：`@@unique([planVersionId, lessonNo])`

---

### CourseRndAiCallLog（AI 调用日志）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| projectId | String? | — | 关联项目（可空，如对话模块） |
| pageKey | String | — | `"direction"` / `"workbench"` / `"chat"` |
| actionType | String | — | 动作类型（generate_framework 等） |
| modelName | String | — | 模型名 |
| inputTokens | Int | DEFAULT 0 | 输入 token |
| outputTokens | Int | DEFAULT 0 | 输出 token |
| estimatedCost | Float | DEFAULT 0 | 预估费用（CNY） |
| cacheHit | Boolean | DEFAULT false | 缓存命中 |
| userId | String? | — | 操作人 |
| metadataJson | String? | LongText | 元数据 |
| promptLog | String? | LongText | 完整 system prompt（审计用） |
| messageLog | String? | LongText | 完整 user message（审计用） |
| createdAt | DateTime | DEFAULT now() | — |

> 注意：此表无外键关联，projectId 为逻辑关联，便于跨表查询。

---

### CourseRndPublishRecord（发布记录）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| projectId | String | FK → CourseRndProject.id | 来源项目 |
| packageSlug | String | — | 发布的课程包 slug |
| packageTitle | String | — | 发布的课程包名称 |
| publishedById | String | FK → User.id | 发布人 |
| resultJson | String? | LongText | 发布结果 |
| createdAt | DateTime | DEFAULT now() | — |

---

## 三、AI 配置表

### AiProvider（服务提供商）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| name | String | — | 提供商名称（如 OpenRouter、PackyAPI） |
| baseUrl | String | — | API 地址 |
| apiKeyEnc | String | Text | AES-256-GCM 加密后的 API Key |
| protocol | String | DEFAULT "openai" | 协议（当前仅 openai 兼容） |
| supportText | Boolean | DEFAULT true | 支持文本生成 |
| supportImage | Boolean | DEFAULT false | 支持图片生成 |
| isActive | Boolean | DEFAULT true | 是否启用 |
| proxyUrl | String? | — | 代理地址（如 `socks5://127.0.0.1:1080`），空为直连 |
| createdAt | DateTime | DEFAULT now() | — |

**关系**：→ AiActionConfig[]

---

### AiActionConfig（动作→模型映射）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| actionKey | String | UNIQUE | 动作标识（如 `"generate_framework"`） |
| actionLabel | String | — | 显示名 |
| actionType | String | — | `"text"` / `"image"` |
| providerId | String | FK → AiProvider.id | 使用的提供商 |
| modelName | String | — | 模型名 |
| inputPricePerM | Float? | — | 输入价格 USD/百万token（文本） |
| outputPricePerM | Float? | — | 输出价格 USD/百万token（文本） |
| pricePerCall | Float? | — | 单次调用价格 USD（图片） |
| pricingSource | String? | — | `"auto"` / `"manual"` |
| pricingUpdatedAt | DateTime? | — | 价格更新时间 |

**已注册动作**：generate_framework / revise_framework / regenerate_lesson / revise_lesson / rewrite_field / rewrite_teaching_talk / validate_lesson / generate_image / generate_cover

---

## 四、基线与 Prompt 表

### BaselineDoc（基线文档）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| type | String | — | `"general"` / `"age"` / `"level"` / `"org_form"` / `"deliverable"` / `"matrix"` |
| key | String | — | `"general"` / `"A1"`~`"A4"` / `"L1"`~`"L4"` / `"S1"`~`"S2"` / `"P1"`~`"P11"` / `"matrix"` |
| label | String | — | 显示名，如 `"A2｜8-9岁 低龄基础段"` |
| content | String | LongText | 基线内容（Markdown） |
| sortOrder | Int | DEFAULT 0 | 排序 |
| currentVersionId | String? | — | 当前版本 ID |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**约束**：`@@unique([type, key])`
**关系**：→ BaselineDocVersion[]（Cascade）

---

### BaselineDocVersion（基线版本历史）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | — |
| baselineDocId | String | FK → BaselineDoc.id | 所属基线 |
| versionNo | Int | — | 版本号 |
| content | String | LongText | 该版本内容 |
| editedById | String? | — | 编辑人 |
| editSummary | String? | — | 编辑摘要 |
| createdAt | DateTime | DEFAULT now() | — |

**约束**：`@@unique([baselineDocId, versionNo])`

---

### PromptTemplate（动作 Prompt 模板）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | — |
| actionKey | String | UNIQUE | 动作标识 |
| actionLabel | String | — | 显示名 |
| content | String | LongText | 模板内容（含 `{{变量名}}` 插值） |
| currentVersionId | String? | — | 当前版本 |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**关系**：→ PromptTemplateVersion[]（Cascade）

---

### PromptTemplateVersion（模板版本历史）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | — |
| templateId | String | FK → PromptTemplate.id | 所属模板 |
| versionNo | Int | — | 版本号 |
| content | String | LongText | 该版本内容 |
| editedById | String? | — | 编辑人 |
| editSummary | String? | — | 编辑摘要 |
| createdAt | DateTime | DEFAULT now() | — |

**约束**：`@@unique([templateId, versionNo])`

---

### Preset（预设值）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | — |
| category | String | — | `"course_direction"` / `"image_style"` / `"core_needs_tag"` / `"constraints_tag"` |
| name | String | — | 预设名称 |
| value | String | Text | 预设值（可含详细提示词） |
| sortOrder | Int | DEFAULT 0 | 排序 |
| isActive | Boolean | DEFAULT true | 是否启用 |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**约束**：`@@unique([category, name])`

---

## 五、系统表

### OperationLog（操作日志）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | — |
| userId | String | FK → User.id | 操作人 |
| module | String | — | `"package"` / `"user"` |
| action | String | — | `"upload"` / `"publish"` / `"online"` / `"offline"` / `"delete"` / `"create"` / `"edit"` / `"reset_password"` |
| targetId | String? | — | 操作目标 ID |
| targetName | String? | — | 操作目标名称 |
| detail | String? | — | 详细信息 |
| createdAt | DateTime | DEFAULT now() | — |

---

### SystemConfig（系统配置）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| key | String | PK | 配置键 |
| value | String | — | 配置值 |
| updatedAt | DateTime | @updatedAt | — |

**已使用的 key**：`usd_to_cny`（美元兑人民币汇率）

---

## 六、AI 对话表

### ChatConversation（对话）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | — |
| userId | String | FK → User.id | 对话所属用户 |
| title | String | DEFAULT "新对话" | 对话标题（AI 自动生成） |
| mode | String | DEFAULT "general" | `"general"` / `"course_design"` |
| createdAt | DateTime | DEFAULT now() | — |
| updatedAt | DateTime | @updatedAt | — |

**关系**：→ ChatMessage[]（Cascade）

---

### ChatMessage（对话消息）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | — |
| conversationId | String | FK → ChatConversation.id | 所属对话 |
| role | String | — | `"user"` / `"assistant"` |
| content | String | LongText | 消息内容 |
| createdAt | DateTime | DEFAULT now() | — |

---

## 数据库迁移

```bash
cd app/

# 本地开发：修改 schema 后生成 migration 并应用
npx prisma migrate dev --name <description>

# 生产部署：仅应用已有 migration
npx prisma migrate deploy

# 种子数据
npx prisma db seed                    # 默认账号
npx tsx prisma/seed-baselines.ts      # 基线 + 模板 + 预设（幂等）

# GUI 管理
npx prisma studio
```

**默认账号**：
- 教师：`teacher01` / `teacher123`
- 管理员：`admin` / `admin123`
- 教学主管：`rd01` / `rd123456`
