# 课程生成工作流程优化 — 实施方案

## 概述

覆盖 9 项需求，分 6 个阶段交付。高优先级（Phase 1-2）修复 AI prompt 上下文缺失问题，中优先级（Phase 3-5）改进工作流交互，低优先级（Phase 6）发布体验优化。

## 需求清单

| # | 需求 | 优先级 | Phase |
|---|------|--------|-------|
| A | 详细方案注入 overview + summary | 高 | 1 |
| B | 补全 coreNeeds/constraints/orgForm/deliverableType/imageStylePrompt | 高 | 1 |
| D | 课次间内容引用（前 N-1 课摘要） | 高 | 1 |
| C | 所有图片生成路由注入 imageStylePrompt | 高 | 2 |
| 2 | 框架修订 + 封面移至框架阶段 | 中 | 3 |
| 3 | 看板布局：三列 → 竖向手风琴 | 中 | 4 |
| 4 | 修改意见暂存 + 批量提交 | 中 | 4 |
| 5 | AI 审核（定稿前检查） | 中 | 5 |
| 6 | 发布表单自动预填 | 低 | 6 |

---

## Phase 1: AI 上下文修复（A + B + D）

### 涉及文件

| 文件 | 改动 |
|------|------|
| `api/.../regenerate/route.ts` | 扩展 select + 查询 DirectionVersion + 重建 userMessage + 扩展 TemplateContext |
| `api/.../revise/route.ts` | 同上 |
| `lib/ai/template-engine.ts` | TemplateContext 增加 courseSummary、generatedLessonsSummary |
| 新建 `lib/ai/lesson-context.ts` | 共享上下文构建函数 |

### 具体操作

1. **regenerate route**：
   - project select 增加 orgForm/deliverableType/deliverableName/imageStylePrompt/roughFramework/coreNeeds/constraints/currentDirectionVersionId
   - 新增查询 CourseRndDirectionVersion（frameworkJson + summary）
   - allDrafts 查询增加 draftJson，提取已生成课次摘要（title/subtitle/goal/outcome）
   - userMessage 重建：注入 summary + 带 overview 的课次列表 + 已生成课次摘要 + 补全字段
   - TemplateContext 同步扩展

2. **revise route**：同样修复

3. **新建 lesson-context.ts**：
   - `buildLessonListWithOverview()` — 课次列表拼 overview
   - `buildGeneratedLessonsSummary()` — 已生成课次摘要（排除当前课次）
   - `buildRegenerateUserMessage()` — 完整 userMessage 构建

---

## Phase 2: 图片风格注入（C）

### 涉及文件（4 个路由）

| 文件 | 改动 |
|------|------|
| `api/.../regenerate/route.ts` | hero 图片 prompt 前加 imageStylePrompt |
| `api/.../revise/route.ts` | 图片修改分支加 imageStylePrompt |
| `api/.../regenerate-image/route.ts` | prompt 前加 imageStylePrompt |
| `api/.../generate-cover/route.ts` | 替换硬编码风格为 imageStylePrompt |

### 统一逻辑

```typescript
const stylePrefix = project.imageStylePrompt
  ? `Style: ${project.imageStylePrompt}. `
  : "";
const finalPrompt = stylePrefix + originalPrompt;
```

---

## Phase 3: 框架修订 + 封面移至框架阶段

### 涉及文件

| 文件 | 改动 |
|------|------|
| 新建 `api/.../revise-framework/route.ts` | 框架修订 API |
| `generate-cover/route.ts` | 支持 customPrompt 参数 |
| `FrameworkResultPanel.tsx` | 增加修改意见输入 + 封面展示 + 封面重新生成弹窗 |
| `CourseRndDirectionPage.tsx` | 对接修订 + 封面生成 |

### 框架修订 API

```
POST /api/course-rnd/projects/[id]/revise-framework
Body: { feedback: string }
→ 加载当前框架 + AI 修订 → 新建 DirectionVersion → 返回新框架
```

### 封面交互

- generate-framework 成功后异步生成封面（不阻塞）
- FrameworkResultPanel 左侧展示封面缩略图
- 重新生成：弹出输入框，预填 prompt，用户可编辑后提交

---

## Phase 4: 看板布局 + 修改意见暂存

### 看板改造

| 文件 | 改动 |
|------|------|
| `CourseRndDashboard.tsx` | 三列 grid → 竖向手风琴 |
| `globals.css` | 新增 kanban-accordion CSS |

布局：三个折叠区竖向排列，"进行中"默认展开，每项目一行一卡。

### 修改意见暂存

| 文件 | 改动 |
|------|------|
| `LessonDraftCard.tsx` | 增加暂存按钮 + 暂存列表展示 |
| `CourseRndWorkbenchPage.tsx` | 管理暂存状态 Map + 合并提交 |
| `api/.../revise/route.ts` | 多条意见时不限定 targetSection |

交互：暂存 → 暂存列表 → 提交全部修改(N条) → 一次 AI 调用

---

## Phase 5: AI 审核

### 涉及文件

| 文件 | 改动 |
|------|------|
| 新建 `api/.../validate/route.ts` | 审核 API |
| `lib/ai/prompts.ts` | 新增 validateLessonPrompt() |
| 新建 `ValidationReportModal.tsx` | 审核报告弹窗 |
| `CourseRndWorkbenchPage.tsx` | 定稿流程改为：审核 → 报告 → 定稿/返回修改 |
| `globals.css` | 审核报告 CSS |

需在 AiActionConfig 新增 `validate_lesson` 动作，管理员可配独立模型。

---

## Phase 6: 发布表单自动预填

### 涉及文件

| 文件 | 改动 |
|------|------|
| `PublishPanel.tsx` | 自动预填 title/ageRange/level/summary/slug |
| `CourseRndWorkbenchPage.tsx` | 传递 directionSummary |
| `workbench/page.tsx` | 查询 direction summary |

---

## 实施顺序

```
Phase 1 → Phase 2 → Phase 3 → Phase 5
                   ↘ Phase 4 → Phase 6
```

Phase 1→2 有依赖，Phase 3-6 彼此独立。

## 无数据模型变更

所有改动基于现有 schema。Phase 5 仅需在 AiActionConfig 新增一条记录。
