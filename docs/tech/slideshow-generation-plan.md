# 课件生成（Slideshow Generation）实施方案

> 需求确认日期：2026-03-27

## 一、功能概述

独立模块「课件生成」，主管/教师/管理员可从已发布课程中选择课次，AI 将教师备课内容转写为学生课堂展示视角的 PPT 课件。

## 二、核心决策

| 项 | 决策 |
|---|------|
| 入口 | 侧边栏独立菜单「课件生成」 |
| 内容来源 | 已发布课程包（`CoursePackage` status=published）的课次 `Lesson.contentData` |
| AI 转写 | 教师备课视角 → 学生课堂展示视角，整课次一次调用 |
| 生成粒度 | 单课次 + 一键全部（逐课次串行） |
| PPT 技术 | pptxgenjs（纯 Node.js） |
| 持久化 | AI 转写 JSON 存 `SlideshowDraft` 表，下载时从 JSON 组装 .pptx |
| 重新生成 | 覆盖当前用户自己的记录 |
| 模板主题 | 存 `Preset` 表（category=slideshow_theme），管理员后台维护 |
| 修订 | 不支持，下载后本地编辑 |
| 预览 | 不做网页预览 |
| PDF | 第一版不做，用户本地转换 |
| 权限 | teacher + rd_manager + admin 均可用 |
| AIGC 配置 | 全部走数据库，禁止硬编码 |

## 三、数据模型

### 3.1 新增表：SlideshowDraft

```prisma
model SlideshowDraft {
  id          String   @id @default(cuid())
  lessonId    String
  userId      String
  themeKey    String   // 使用的主题预设 name
  contentJson String   @db.LongText // AI 转写结果 JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([lessonId, userId]) // 每个用户对每个课次最多一条
}
```

需同步更新 `User` 和 `Lesson` 模型添加反向关系。

### 3.2 新增 Preset 类别

```
category = "slideshow_theme"
```

种子数据提供 4 套默认主题：

| name | 说明 |
|------|------|
| 科技蓝 | 蓝紫渐变、简洁几何，适合 STEAM/编程/AI |
| 自然绿 | 绿色系、柔和插画风，适合自然探索/生态 |
| 创意橙 | 暖色活泼、圆角卡片，适合低龄段艺术/手工 |
| 简约白 | 黑白灰、大留白，通用/高龄段/严肃主题 |

每套主题的 `value` 为 JSON，包含：
```json
{
  "background": "#0F1B2D",
  "titleColor": "#7CB3FF",
  "bodyColor": "#E0E8F0",
  "accentColor": "#5B8DEF",
  "titleFont": "Microsoft YaHei",
  "bodyFont": "Microsoft YaHei",
  "titleFontSize": 36,
  "bodyFontSize": 18,
  "layoutStyle": "tech"
}
```

### 3.3 新增 BaselineDoc

```
type = "slideshow"
key  = "slideshow_general"
label = "课件生成通用基线"
```

内容覆盖：
- 学生视角转写原则（语言风格按年龄段区分）
- 课堂展示排版原则（信息密度、图文比）
- PPT 页面节奏控制（每页不超过 X 要点）
- 页面类型使用指引（封面/内容/互动/展示/结束）

### 3.4 新增 PromptTemplate

```
actionKey   = "generate_slideshow"
actionLabel = "生成课件"
```

模板中可用变量（复用现有 + 新增）：
- 复用：`{{项目标题}}`、`{{年龄段}}`、`{{目标级别}}`、`{{课次标题}}`
- 复用：`{{通用基线}}`、`{{年龄段基线}}`
- 新增：`{{课件基线}}` — slideshow_general 基线内容
- 新增：`{{课次完整内容}}` — 当前课次的 contentData JSON
- 新增：`{{主题配置}}` — 选中的主题信息（用于指导 AI 输出风格提示）

### 3.5 新增 AiActionConfig

```
actionKey   = "generate_slideshow"
actionLabel = "生成课件"
actionType  = "text"
```

管理员在 AI 服务配置页配置对应的模型。

## 四、AI 转写输出格式

AI 输出结构化 JSON，系统用 pptxgenjs 按此渲染：

```typescript
interface SlideshowOutput {
  slides: Slide[];
}

interface Slide {
  type: "cover" | "content" | "interaction" | "showcase" | "ending";
  title: string;
  subtitle?: string;
  body?: string;         // Markdown 格式正文
  bullets?: string[];    // 要点列表
  imagePrompt?: string;  // 图片描述（用于未来扩展，第一版不生成图片）
  notes?: string;        // 演讲者备注（教师参考）
}
```

页面类型说明：
- **cover**：封面页（课程名 + 课次标题 + 副标题）
- **content**：内容页（引导语、知识点、任务说明）
- **interaction**：互动页（AI 提示、动手任务）
- **showcase**：展示页（学生产出引导、点评框架）
- **ending**：结束页（总结 + 下节预告）

## 五、API 设计

### 5.1 生成课件

```
POST /api/slideshow/generate
Body: { lessonId: string, themeKey: string }
Response: SSE stream（进度 + 最终结果）
```

流程：
1. 校验权限（三角色均可）
2. 查询 Lesson（必须属于 published 课程包，必须有 contentData）
3. 加载 Prompt 模板 + 基线（`resolveTemplate("generate_slideshow", context)`）
4. 调用 `provider.chatStream()` 流式生成
5. 解析 AI 输出 JSON
6. Upsert `SlideshowDraft`（覆盖当前用户已有记录）
7. 记录 `CourseRndAiCallLog`（pageKey="slideshow"）
8. 返回生成结果

### 5.2 下载课件

```
GET /api/slideshow/download?lessonId=xxx
Response: .pptx 文件流
```

流程：
1. 查询当前用户的 `SlideshowDraft`
2. 从 `contentJson` 解析 JSON
3. 查询 `Preset`（category=slideshow_theme, name=themeKey）获取主题配置
4. pptxgenjs 按主题 + 内容组装 PPT
5. 返回文件流

### 5.3 查询课件状态

```
GET /api/slideshow/status?packageId=xxx
Response: { lessons: [{ lessonId, lessonNo, title, hasDraft: boolean, updatedAt }] }
```

用于课次列表页展示哪些课次已生成过课件。

### 5.4 批量生成

不设独立 API。前端逐课次调用 `POST /api/slideshow/generate`，自行管理队列和进度。

## 六、前端页面

### 6.1 路由

```
app/(app)/slideshow/page.tsx                    — 课程包选择页
app/(app)/slideshow/[slug]/page.tsx             — 课次列表 + 课件操作页
```

### 6.2 课程包选择页 `/slideshow`

- 复用课程包卡片样式
- 只展示 `status = "published"` 的课程包
- 点击进入课次列表

### 6.3 课次列表页 `/slideshow/[slug]`

- 顶部：主题选择器（横排主题卡片，单选）
- 顶部操作：「一键生成全部」按钮
- 课次列表：每行显示课次号、标题、状态（未生成/已生成）、操作按钮
- 操作按钮状态：
  - 未生成 →「生成课件」
  - 生成中 → loading + 进度文字
  - 已生成 →「下载」+「重新生成」
- 一键生成时：显示整体进度 "正在生成第 3/8 课..."，全部完成后显示「下载全部」

### 6.4 Sidebar 新增入口

```
图标：Presentation（lucide-react）
标签：课件生成
路由：/slideshow
权限：三角色均可见
```

### 6.5 TopBar

- 课程包选择页：`title="课件生成"`
- 课次列表页：`breadcrumb="课件生成"`, `title="{课程包名称}"`

## 七、权限

在 `lib/permissions.ts` 新增：

```typescript
GENERATE_SLIDESHOW  // teacher + rd_manager + admin
```

## 八、依赖安装

```bash
npm install pptxgenjs
```

## 九、任务拆解

### Phase 0：数据库 + 依赖（1 个任务）
- P0.1 新增 SlideshowDraft 模型 + migration + 安装 pptxgenjs

### Phase 1：Prompt/基线/预设种子数据（1 个任务）
- P1.1 新增 slideshow 基线 + generate_slideshow 模板 + slideshow_theme 预设 + AiActionConfig 种子数据

### Phase 2：AI 转写服务层（2 个任务）
- P2.1 template-engine 扩展 — 新增课件相关变量（课件基线、课次完整内容、主题配置）
- P2.2 课件生成核心逻辑 — `lib/slideshow/generate.ts`（调用 AI + 解析输出 + 持久化）

### Phase 3：PPT 组装服务（1 个任务）
- P3.1 PPT 生成器 — `lib/slideshow/pptx-builder.ts`（读取主题 Preset + SlideshowOutput → .pptx Buffer）

### Phase 4：API 路由（3 个任务）
- P4.1 `POST /api/slideshow/generate` — SSE 流式生成
- P4.2 `GET /api/slideshow/download` — 下载 .pptx
- P4.3 `GET /api/slideshow/status` — 查询课件状态

### Phase 5：前端页面（3 个任务）
- P5.1 课程包选择页 `/slideshow`
- P5.2 课次列表页 `/slideshow/[slug]`（含主题选择 + 单课次生成 + 下载）
- P5.3 一键生成全部 + 下载全部（zip 打包）

### Phase 6：集成（2 个任务）
- P6.1 Sidebar 新增入口 + 权限矩阵更新
- P6.2 使用指南更新（TeacherGuide + RdManagerGuide）

### Phase 7：测试（1 个任务）
- P7.1 API 测试 + lib 测试（覆盖生成/下载/状态查询/权限校验）

共 14 个子任务，7 个 Phase。
