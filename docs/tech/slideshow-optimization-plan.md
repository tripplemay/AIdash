# 课件生成功能优化 — 实施方案

> 需求确认日期：2026-03-27

## 一、优化内容

1. **课件图片**：复用课次已有图片 + AI 生成新图片
2. **后台任务模式**：生成任务独立于前端连接，断开不中断
3. **进度显示**：前端轮询进度，展示当前步骤

## 二、数据模型变更

### SlideshowDraft 新增字段

```prisma
model SlideshowDraft {
  // ... 现有字段
  status       String   @default("idle")    // "idle" | "generating" | "completed" | "failed"
  progress     String?  @db.Text            // JSON: { step, total, message }
  errorMessage String?  @db.Text            // 失败原因
}
```

状态流转：
```
idle → generating → completed
                  → failed
```

### Slide 类型新增 imageUrl

```typescript
interface Slide {
  // ... 现有字段
  imageUrl?: string | null;   // 图片 URL（复用或 AI 生成后填入）
}
```

## 三、生成流程（后台任务模式）

```
前端 POST /api/slideshow/generate
    ↓
后端创建/更新 draft（status=generating, progress=步骤1）→ 立即返回 draftId
    ↓
后台异步执行：
    步骤 1：AI 文本转写（生成 slides JSON）
    步骤 2：处理封面图（复用 hero.imageUrl）
    步骤 3~N：逐页处理图片
        - 有 imagePrompt 且课次无可复用图 → AI 生成
        - 有 imagePrompt 但可复用 → 复用
        - 无 imagePrompt → 跳过
    步骤 N+1：处理结束页图（复用封面图）
    步骤 N+2：保存最终结果（status=completed）
    ↓
每完成一步更新 draft.progress
    ↓
前端轮询 GET /api/slideshow/status 展示进度
```

## 四、图片处理策略

| 页面类型 | 图片策略 |
|----------|---------|
| cover | 固定配图：复用 `contentData.hero.imageUrl`，无则 AI 生成 |
| content | AI 判断：有 imagePrompt 时处理，无则跳过 |
| interaction | AI 判断：同上 |
| showcase | AI 判断：同上 |
| ending | 固定配图：复用封面图 |

AI 生成时 prompt 组装顺序（复用现有模式）：
```
年龄提示 + 风格前缀 + imagePrompt
```

图片存储复用 `saveAiImage()` → `/api/ai-images/slideshow/{hash}.png`

## 五、API 变更

### 5.1 POST /api/slideshow/generate（改造）

**现在**：同步执行，完成后返回结果
**改为**：创建 draft → 触发后台任务 → 立即返回 draftId

```
Request:  { lessonId, themeKey }
Response: { data: { draftId, status: "generating" } }
```

### 5.2 GET /api/slideshow/status（增强）

现有返回增加 draft 的 status 和 progress 信息：

```typescript
{
  lessonId, lessonNo, title, hasContent,
  hasDraft: true,
  status: "generating",           // 新增
  progress: {                     // 新增
    step: 3,
    total: 7,
    message: "正在生成第 3 页图片..."
  },
  themeKey, updatedAt
}
```

### 5.3 其他 API 无变化

download / download-all 仅在 status=completed 时可用。

## 六、前端变更

### SlideshowWorkspace 改造

课次状态扩展为 4 种：

| 状态 | 显示 | 操作 |
|------|------|------|
| 未生成 | — | 「生成课件」 |
| 生成中 | 进度条 + 步骤文字 | 禁用操作 |
| 已完成 | ✅ 已生成 | 「下载」+「重新生成」|
| 失败 | ❌ 生成失败 + 原因 | 「重试」 |

生成中轮询逻辑：
- 点击「生成课件」→ POST 触发 → 每 2 秒轮询 status
- 显示进度："正在转写课件内容..." → "正在生成第 3 页图片 (3/7)..." → "✅ 完成"
- 用户离开页面 → 后台继续 → 回来后轮询恢复进度

### 一键生成全部

串行触发每个课次的 POST，但不等待完成，而是统一轮询所有课次的状态。

## 七、Prompt/基线更新

### 课件基线补充图片判断指引

在 `slideshow_general` 基线中增加：
- 何时需要配图（引导观察、展示成果、激发兴趣的页面）
- 何时不需要配图（操作指引、纯文字任务说明）
- imagePrompt 描述规范（英文、具体场景、匹配年龄段）

### generate_slideshow 模板补充

- Slide 输出格式增加 imagePrompt 字段说明
- 引导 AI 对封面页和结束页必填 imagePrompt
- 中间页按内容自主判断

### 新增 AiActionConfig 动作

`slideshow_image` — 课件图片生成（type=image），管理员配置模型

### 新增 ai_action_registry Preset

`slideshow_image` 注册条目

## 八、任务拆解

### Phase 0：数据模型 + 依赖（1 个任务）
- P0.1 SlideshowDraft 新增 status/progress/errorMessage + migration + Slide 类型新增 imageUrl

### Phase 1：Prompt/基线更新（1 个任务）
- P1.1 更新课件基线（图片判断指引）+ generate_slideshow 模板（imagePrompt 输出）+ slideshow_image 动作注册

### Phase 2：后台任务核心逻辑（2 个任务）
- P2.1 重构 generate.ts — 拆为 triggerGeneration（同步创建 draft）+ executeGeneration（异步后台执行）
- P2.2 图片处理模块 — lib/slideshow/image-processor.ts（复用判断 + AI 生成 + saveAiImage）

### Phase 3：API 改造（1 个任务）
- P3.1 POST /api/slideshow/generate 改为触发后台任务 + GET status 增加进度字段

### Phase 4：前端改造（1 个任务）
- P4.1 SlideshowWorkspace 轮询进度 + 4 种状态展示 + 一键生成适配

### Phase 5：PPT builder 支持图片（1 个任务）
- P5.1 pptx-builder 读取 slide.imageUrl 插入图片到 PPT

### Phase 6：测试（1 个任务）
- P6.1 API 测试 + 图片处理测试 + 进度轮询测试

共 8 个子任务，7 个 Phase。
