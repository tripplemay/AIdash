# 自定义课程生成基线和系统提示词模板 — 实施方案

## 概述

将当前硬编码的 AI prompt 体系（基线从 markdown 文件加载、动作 prompt 散落在代码中）改造为数据库驱动、管理员可配置的系统。基线按维度拆分，按项目属性自动拼装。动作 prompt 模板支持变量插值和版本管理。课程创建表单从自由输入改为结构化选择。

---

## 1. 数据库 Schema 设计

### 新增 5 个模型

```prisma
// ─── 基线文档（按维度拆分） ───
model BaselineDoc {
  id               String   @id @default(cuid())
  type             String   // "general" | "age" | "level" | "org_form" | "deliverable" | "matrix"
  key              String   // "general" | "A1" | "A2" | ... | "L1" | ... | "S1" | "P1" ...
  label            String   // 显示名, e.g. "A2｜8-9岁 低龄基础段"
  content          String   @db.LongText
  sortOrder        Int      @default(0)
  currentVersionId String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  versions         BaselineDocVersion[]

  @@unique([type, key])
}

model BaselineDocVersion {
  id            String      @id @default(cuid())
  baselineDocId String
  versionNo     Int
  content       String      @db.LongText
  editedById    String?
  editSummary   String?
  createdAt     DateTime    @default(now())
  baselineDoc   BaselineDoc @relation(fields: [baselineDocId], references: [id], onDelete: Cascade)

  @@unique([baselineDocId, versionNo])
}

// ─── 动作 Prompt 模板 ───
model PromptTemplate {
  id               String   @id @default(cuid())
  actionKey        String   @unique  // 6 个动作
  actionLabel      String
  content          String   @db.LongText
  currentVersionId String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  versions         PromptTemplateVersion[]
}

model PromptTemplateVersion {
  id           String         @id @default(cuid())
  templateId   String
  versionNo    Int
  content      String         @db.LongText
  editedById   String?
  editSummary  String?
  createdAt    DateTime       @default(now())
  template     PromptTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, versionNo])
}

// ─── 预设值（课程方向、图片风格、标签等） ───
model Preset {
  id        String   @id @default(cuid())
  category  String   // "course_direction" | "image_style" | "core_needs_tag" | "constraints_tag"
  name      String   // 显示名
  value     String   @db.Text  // 完整描述 / 英文提示词
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([category, name])
}
```

### CourseRndProject 新增字段

```prisma
model CourseRndProject {
  // ... existing fields ...
  orgForm           String?   // "S1" | "S2"
  deliverableType   String?   // "P1" ~ "P11"
  deliverableName   String?   // 具体产出物名称（自由输入）
  imageStyle        String?   // 图片风格预设 key
  imageStylePrompt  String?   @db.Text  // 实际使用的英文提示词（可能被用户修改）
}
```

---

## 2. 变量引擎设计

### 2.1 固定变量清单（~26 个）

| 变量名 | 分组 | 来源 | 说明 |
|--------|------|------|------|
| `{{项目标题}}` | 项目信息 | project.title | |
| `{{课程方向}}` | 项目信息 | project.courseDirection | |
| `{{目标年龄段}}` | 项目信息 | project.ageRange | 如 "A2" |
| `{{年龄段标签}}` | 项目信息 | BaselineDoc lookup | 如 "A2｜8-9岁 低龄基础段" |
| `{{目标级别}}` | 项目信息 | project.level | 如 "L2" |
| `{{级别标签}}` | 项目信息 | BaselineDoc lookup | 如 "L2｜AI 基础应用" |
| `{{课程组织形态}}` | 项目信息 | project.orgForm | 如 "S1" |
| `{{组织形态标签}}` | 项目信息 | BaselineDoc lookup | 如 "S1｜单课闭环型" |
| `{{产出物形态}}` | 项目信息 | project.deliverableType | 如 "P3" |
| `{{产出物标签}}` | 项目信息 | BaselineDoc lookup | 如 "P3｜故事类" |
| `{{产出物名称}}` | 项目信息 | project.deliverableName | 具体名称 |
| `{{预计课次数}}` | 项目信息 | project.lessonCount | |
| `{{图片风格提示词}}` | 项目信息 | project.imageStylePrompt | 英文关键词 |
| `{{大致框架}}` | 项目信息 | project.roughFramework | |
| `{{核心诉求}}` | 项目信息 | project.coreNeeds | 标签 + 自由文本 |
| `{{补充约束}}` | 项目信息 | project.constraints | 标签 + 自由文本 |
| `{{通用基线}}` | 基线 | DB: type=general | 通用课程设计基线全文 |
| `{{年龄段基线}}` | 基线 | DB: 按 ageRange 匹配 | 对应年龄段基线 |
| `{{级别基线}}` | 基线 | DB: 按 level 匹配 | 对应级别基线 |
| `{{组织形态基线}}` | 基线 | DB: 按 orgForm 匹配 | 对应组织形态基线 |
| `{{产出物基线}}` | 基线 | DB: 按 deliverableType 匹配 | 对应产出物基线 |
| `{{分层规则矩阵}}` | 基线 | DB: type=matrix | |
| `{{当前课次号}}` | 上下文 | lessonNo | |
| `{{当前课次标题}}` | 上下文 | draft.title | |
| `{{全部课次概览}}` | 上下文 | all drafts | |
| `{{当前课次方案}}` | 上下文 | draft.draftJson | revise 用 |
| `{{修改意见}}` | 上下文 | user feedback | revise 用 |
| `{{目标板块}}` | 上下文 | targetSection | revise 用 |

### 2.2 解析流程

```
resolveTemplate(actionKey, context):
  1. 从 DB 加载 PromptTemplate（fallback: 硬编码默认值）
  2. 调用 baseline assembler 获取匹配的基线内容
  3. 构建变量映射表
  4. 替换所有 {{变量名}}（未知变量保留原样，缺失值替换为"未指定"）
  5. 返回最终 prompt 字符串
```

### 2.3 关键文件

- `app/lib/ai/template-engine.ts` — resolveTemplate() 主函数
- `app/lib/ai/template-variables.ts` — 变量元数据（key, group, description，供管理端侧边栏展示）
- `app/lib/ai/baseline-assembler.ts` — 基线拼装器

---

## 3. 基线拼装器设计

```
assembleBaselines({ ageRange, level, orgForm, deliverableType }):
  1. 查询 BaselineDoc WHERE (type="general", key="general")       → 通用基线
  2. 查询 BaselineDoc WHERE (type="age", key=ageRange)             → 年龄段基线
  3. 查询 BaselineDoc WHERE (type="level", key=level)              → 级别基线
  4. 查询 BaselineDoc WHERE (type="org_form", key=orgForm)         → 组织形态基线
  5. 查询 BaselineDoc WHERE (type="deliverable", key=deliverableType) → 产出物基线
  6. 查询 BaselineDoc WHERE (type="matrix", key="matrix")          → 分层规则矩阵
  7. 返回 { general, age, level, orgForm, deliverable, matrix }
```

Fallback：DB 无记录时从 `docs/baseline/` 读取 markdown 文件（保持当前行为）。

---

## 4. API 路由设计

### 4.1 基线管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/admin/baselines` | admin, rd_manager, teacher | 列出所有基线（按 type 分组） |
| GET | `/api/admin/baselines/[id]` | admin, rd_manager, teacher | 获取单条基线内容 |
| PUT | `/api/admin/baselines/[id]` | admin | 更新基线（自动创建版本） |
| GET | `/api/admin/baselines/[id]/versions` | admin, rd_manager, teacher | 版本历史列表 |
| GET | `/api/admin/baselines/[id]/versions/[versionId]` | admin, rd_manager, teacher | 获取特定版本内容 |
| POST | `/api/admin/baselines/[id]/rollback` | admin | 回滚到指定版本 |
| GET | `/api/admin/baselines/[id]/diff?v1=X&v2=Y` | admin, rd_manager, teacher | 两版本 diff 对比 |

### 4.2 Prompt 模板管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/admin/prompt-templates` | admin, rd_manager, teacher | 列出全部模板 |
| GET | `/api/admin/prompt-templates/[actionKey]` | admin, rd_manager, teacher | 获取单个模板 |
| PUT | `/api/admin/prompt-templates/[actionKey]` | admin | 更新模板（自动创建版本） |
| GET | `/api/admin/prompt-templates/[actionKey]/versions` | admin, rd_manager, teacher | 版本历史 |
| POST | `/api/admin/prompt-templates/[actionKey]/rollback` | admin | 回滚 |
| GET | `/api/admin/prompt-templates/[actionKey]/diff?v1=X&v2=Y` | admin, rd_manager, teacher | diff |
| GET | `/api/admin/prompt-templates/variables` | admin, rd_manager, teacher | 可用变量列表 |

### 4.3 预设管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/admin/presets?category=X` | admin, rd_manager, teacher | 按分类列出预设 |
| POST | `/api/admin/presets` | admin | 创建预设 |
| PUT | `/api/admin/presets/[id]` | admin | 更新预设 |
| DELETE | `/api/admin/presets/[id]` | admin | 删除预设 |
| PUT | `/api/admin/presets/reorder` | admin | 排序 |

### 4.4 表单选项（公开 API）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/course-rnd/form-options` | COURSE_RND_ROLES | 返回所有下拉/标签选项 |

响应格式：
```json
{
  "data": {
    "ageRanges": [{ "key": "A1", "label": "A1｜6-7岁 启蒙段" }, ...],
    "levels": [{ "key": "L1", "label": "L1｜AI 启蒙使用" }, ...],
    "orgForms": [{ "key": "S1", "label": "S1｜单课闭环型" }, ...],
    "deliverableTypes": [
      { "group": "基础稳态产出物池", "items": [{ "key": "P1", "label": "P1｜档案类" }, ...] },
      { "group": "高作品感扩展产出物池", "items": [{ "key": "P6", "label": "P6｜图片类" }, ...] }
    ],
    "courseDirections": [{ "name": "AI 辅助故事创作", "value": "用 AI 辅助学生..." }],
    "imageStyles": [{ "name": "扁平可爱风", "value": "扁平插画风格，可爱角色，明亮柔和配色..." }],
    "coreNeedsTags": ["强调作品完成度", "强调动手实操", ...],
    "constraintsTags": ["45分钟课时", "60分钟课时", ...]
  }
}
```

---

## 5. 前端组件设计

### 5.1 管理端 — Prompt 配置页

路径：`/admin/prompt-config`

三个 Tab：
1. **基线管理** — BaselineManager
2. **提示词模板** — PromptTemplateEditor
3. **预设管理** — PresetManager

### 5.2 BaselineManager

- 左侧边栏：基线列表按 type 分组（通用 / 年龄段 / 级别 / 组织形态 / 产出物 / 矩阵）
- 右侧面板：markdown 编辑器（textarea）
- 下方：版本历史列表（时间 + 编辑者 + 摘要）
- 操作：保存（admin only）、查看历史、版本对比
- Diff 弹窗：逐行对比，绿色高亮新增、红色高亮删除

### 5.3 PromptTemplateEditor

- 左侧：6 个动作导航（竖排列表）
- 中间：大型 textarea 编辑模板
- 右侧边栏（240px）：变量列表按分组展示，点击插入 `{{变量名}}` 到光标位置
- 下方：版本历史（复用 VersionHistory 组件）

### 5.4 PresetManager

- Tab 切换：course_direction / image_style / core_needs_tag / constraints_tag
- 可排序列表（上下移动按钮）
- 每项：名称 + 值（可展开） + 编辑/删除按钮
- 底部新增按钮

### 5.5 DirectionInputForm（重写）

最终字段布局：

| 字段 | 组件 | 说明 |
|------|------|------|
| 项目标题 * | input | 不变 |
| 课程方向 | PresetDropdownWithEditor | 下拉预设 → 填入完整描述 → 可编辑 |
| 年龄段 | select | 选项从 BaselineDoc type=age 读取 |
| 难度级别 | select | 选项从 BaselineDoc type=level 读取 |
| 课程组织形态（新增） | select | 选项从 BaselineDoc type=org_form 读取 |
| 预计课次数 | number input | 不变 |
| 产出物形态 | GroupedSelect + input | 下拉选大类（含分组）+ 输入具体名称 |
| 图片风格（新增） | PresetDropdownWithEditor | 下拉 → 显示英文提示词 → 可编辑。切换时若已修改弹确认 |
| 大致框架 | textarea | 优化 placeholder + 辅助说明 |
| 核心诉求 | TagPicker + textarea | 标签多选 + 自由补充 |
| 补充约束 | TagPicker + textarea | 标签多选 + 自由补充 |

### 5.6 新增可复用子组件

- `TagPicker.tsx` — 多选标签组件
- `PresetDropdownWithEditor.tsx` — 下拉预设 + 关联文本框（含脏状态追踪 + 切换确认）
- `GroupedSelect.tsx` — 带 optgroup 的 select（产出物分组）
- `VersionHistory.tsx` — 版本历史列表（基线/模板复用）
- `DiffView.tsx` — 逐行 diff 对比视图

---

## 6. 种子数据迁移方案

文件：`app/prisma/seed-baselines.ts`

### 6.1 基线文档（从 docs/baseline/ 导入）

| type | key | 来源文件 |
|------|-----|---------|
| general | general | `AI生成课程系统共用基线_课程设计原则与生成约束_v3.md` |
| age | A1 | 从 `课程生成系统年龄段基线_v1.1.md` 提取 A1 章节 |
| age | A2 | 同上，提取 A2 章节 |
| age | A3 | 同上，提取 A3 章节 |
| age | A4 | 同上，提取 A4 章节 |
| level | L1 | 从 `课程生成系统级别基线_v1.md` 提取 L1 章节 |
| level | L2 | 同上 |
| level | L3 | 同上 |
| level | L4 | 同上 |
| org_form | S1 | 从 `课程生成系统课程组织形态基线_v1.1.md` 提取 S1 章节 |
| org_form | S2 | 同上 |
| deliverable | P1-P11 | 从 `课程生成系统产出物形态基线_v1.1.md` 逐章节提取 |
| matrix | matrix | `课程生成系统分层生成规则矩阵_v1.md` 全文 |

共 22 条基线记录，每条自动创建 versionNo=1 的初始版本。

### 6.2 Prompt 模板（从硬编码提取）

| actionKey | actionLabel | 来源 |
|-----------|-------------|------|
| generate_framework | 生成课程框架 | `generateFrameworkPrompt()` in prompts.ts |
| revise_framework | 修订课程框架 | `reviseFrameworkPrompt()` in prompts.ts |
| regenerate_lesson | 生成课次方案 | `SYSTEM_PROMPT` in regenerate/route.ts |
| revise_lesson | 修改课次方案 | `SYSTEM_PROMPT` in revise/route.ts |
| rewrite_field | 改写指定字段 | `rewriteFieldPrompt()` in prompts.ts |
| rewrite_teaching_talk | 生成教学话术 | `rewriteTeachingTalkPrompt()` in prompts.ts |

提取时将硬编码的上下文拼接处改为 `{{变量名}}` 语法。

### 6.3 预设数据

**课程方向预设（6 个）：**
- AI 辅助故事创作 → "用 AI 辅助学生进行故事创作，包括角色设计、情节构思、场景描绘，引导学生借助 AI 完成从灵感到成品的完整创作链"
- AI 辅助科学探究 → "用 AI 辅助学生进行科学探究活动，从提出假设到设计实验方案，借助 AI 进行数据分析和可视化呈现"
- AI 辅助艺术设计 → "用 AI 辅助学生进行视觉艺术创作，从灵感采集到作品设计，学会将创意想法转化为具体的视觉作品"
- AI 辅助音乐创作 → "用 AI 辅助学生进行音乐创作，从旋律构思到编曲制作，体验用 AI 工具将音乐灵感转化为可听的作品"
- AI 辅助游戏设计 → "用 AI 辅助学生设计游戏，从规则构思到原型搭建，学会用 AI 快速生成游戏素材和逻辑框架"
- AI 辅助表达写作 → "用 AI 辅助学生进行多形式写作表达，从观点梳理到文章成型，借助 AI 提升表达的结构性和完整度"

**图片风格预设（8 个）：**

> 图片风格提示词统一使用中文。用户选择预设后文本框显示中文描述，可自由编辑。系统生成图片时直接将中文描述注入 prompt（现代图片模型均支持中文理解）。

| 名称 | 中文描述（用户可见/可编辑） |
|------|--------------------------|
| 扁平可爱风 | 扁平插画风格，可爱角色，明亮柔和配色，简洁图形，适合儿童，细节精简，线条干净 |
| 水彩绘本风 | 水彩插画风格，绘本质感，柔和色调，轻柔笔触，梦幻氛围，儿童绘本美术风格 |
| 手绘涂鸦风 | 手绘涂鸦风格，素描线条，活泼有趣，彩色马克笔质感，笔记本纸张纹理 |
| 3D 卡通风 | 3D 卡通渲染，皮克斯风格，鲜艳色彩，圆润造型，柔和光影，欢快角色 |
| 科技未来风 | 未来科技风数字艺术，全息元素，深色背景霓虹点缀，科技界面感，现代简洁 |
| 像素复古风 | 像素艺术风格，复古游戏美感，16 位色彩，方块角色，怀旧趣味 |
| 纸艺拼贴风 | 纸艺拼贴风格，剪纸图形，多层纸张纹理，手工感，彩色卡纸质感 |
| 日系清新风 | 日系动漫插画风格，干净线稿，柔和赛璐璐上色，淡色背景，角色表情丰富 |

**核心诉求标签（9 个）：**
强调作品完成度、强调动手实操、强化同伴协作、降低文字负担、增加 AI 互动环节、适配零基础学生、每课独立成果、强调创意表达、控制课堂节奏

**补充约束标签（11 个）：**
45分钟课时、60分钟课时、90分钟课时、4-6人小班、线上授课、无电脑环境、禁止纯工具教学、禁止纯知识讲授、避免同质化、需要家长配合、需要提前准备素材

---

## 7. 分阶段实施计划

### Phase 1：数据库基础 + 核心引擎

**目标**：新表就位，种子数据导入，模板引擎和基线拼装器工作正常。AI 调用行为零变化。

| 步骤 | 文件 | 操作 | 风险 |
|------|------|------|------|
| 1.1 | prisma/schema.prisma | 新增 5 个模型 + CourseRndProject 新字段 | 低 |
| 1.2 | — | `npx prisma migrate dev --name add-baseline-prompt-tables` | 低 |
| 1.3 | prisma/seed-baselines.ts（新） | 种子脚本：从 docs 导入基线 + 从代码提取 prompt + 写入预设 | 中 |
| 1.4 | lib/ai/baseline-assembler.ts（新） | 基线拼装器 + fallback 到文件读取 | 低 |
| 1.5 | lib/ai/template-variables.ts（新） | 变量元数据定义 | 低 |
| 1.6 | lib/ai/template-engine.ts（新） | resolveTemplate() 主函数 | 中 |
| 1.7 | lib/ai/prompts.ts | 重写为 DB 驱动 + fallback 到硬编码 | **高** |
| 1.8 | 4 个 AI route 文件 | 替换 `getBaselinePrompt() + xxxPrompt()` 为 `resolveTemplate()` | **高** |
| 1.9 | lib/permissions.ts | 新增 PROMPT_CONFIG 权限 | 低 |

**交付标准**：所有现有 AI 功能行为不变，typecheck + test 通过。

### Phase 2：管理端 UI — 基线 + 模板编辑

**目标**：管理员可在 web 端编辑基线和 prompt 模板，含版本管理和 diff。

| 步骤 | 文件 | 操作 | 风险 |
|------|------|------|------|
| 2.1 | api/admin/baselines/\*（新，6 个路由文件） | 基线 CRUD + 版本 + 回滚 + diff API | 低 |
| 2.2 | api/admin/prompt-templates/\*（新，6 个路由文件） | 模板 CRUD + 版本 + 回滚 + diff + 变量列表 API | 低 |
| 2.3 | lib/diff-utils.ts（新） | 逐行 diff 算法 | 低 |
| 2.4 | globals.css | 新增 CSS 类（约 120 行） | 低 |
| 2.5 | components/admin/BaselineManager.tsx（新） | 基线编辑器（分组侧边栏 + 编辑器 + 版本历史） | 中 |
| 2.6 | components/admin/PromptTemplateEditor.tsx（新） | 模板编辑器（动作导航 + 编辑器 + 变量侧边栏） | 中 |
| 2.7 | components/admin/VersionHistory.tsx + DiffView.tsx（新） | 版本历史 + diff 对比（复用组件） | 中 |
| 2.8 | admin/prompt-config/page.tsx（新） + Sidebar.tsx | 管理页面 + 侧边栏入口 | 低 |

**交付标准**：管理员可编辑基线/模板、查看版本历史、对比 diff、回滚。

### Phase 3：预设管理 + 表单改造

**目标**：管理员可维护预设。课程创建表单使用数据库驱动的下拉/标签。

| 步骤 | 文件 | 操作 | 风险 |
|------|------|------|------|
| 3.1 | api/admin/presets/\*（新，3 个路由文件） | 预设 CRUD + 排序 API | 低 |
| 3.2 | api/course-rnd/form-options/route.ts（新） | 表单选项聚合 API | 低 |
| 3.3 | components/admin/PresetManager.tsx（新） | 预设管理组件 + 接入 prompt-config 页面第三个 Tab | 低 |
| 3.4 | components/course-rnd/TagPicker.tsx（新） | 可复用标签多选组件 | 低 |
| 3.5 | components/course-rnd/PresetDropdownWithEditor.tsx（新） | 下拉预设 + 关联文本框（含脏状态 + 切换确认） | 中 |
| 3.6 | components/course-rnd/GroupedSelect.tsx（新） | 带 optgroup 的 select | 低 |
| 3.7 | components/course-rnd/DirectionInputForm.tsx | 完整重写表单 | **高** |
| 3.8 | 项目创建/更新 API | 接收和持久化新字段 | 中 |

**交付标准**：表单使用结构化输入，预设管理可用。旧项目兼容。

### Phase 4：收尾优化

| 步骤 | 文件 | 操作 | 风险 |
|------|------|------|------|
| 4.1 | BaselineManager, PromptTemplateEditor, PresetManager | rd_manager/teacher 只读模式 | 低 |
| 4.2 | DirectionInputForm | 旧项目自由文本值兼容处理 | 中 |
| 4.3 | baseline-assembler.ts | token 用量统计 | 低 |
| 4.4 | AI route 文件 | promptSnapshot 保存完整解析后的 prompt | 低 |

---

## 8. 文件清单

### 新增文件（18 个）

| 文件 | 说明 |
|------|------|
| `app/lib/ai/baseline-assembler.ts` | 基线拼装器 |
| `app/lib/ai/template-engine.ts` | 模板变量引擎 |
| `app/lib/ai/template-variables.ts` | 变量元数据 |
| `app/lib/diff-utils.ts` | 逐行 diff 工具 |
| `app/prisma/seed-baselines.ts` | 基线/模板/预设种子脚本 |
| `app/app/(app)/admin/prompt-config/page.tsx` | Prompt 配置管理页 |
| `app/app/api/admin/baselines/route.ts` + 嵌套路由 | 基线 API |
| `app/app/api/admin/prompt-templates/route.ts` + 嵌套路由 | 模板 API |
| `app/app/api/admin/presets/route.ts` + 嵌套路由 | 预设 API |
| `app/app/api/course-rnd/form-options/route.ts` | 表单选项 API |
| `app/components/admin/BaselineManager.tsx` | 基线编辑器 |
| `app/components/admin/PromptTemplateEditor.tsx` | 模板编辑器 |
| `app/components/admin/PresetManager.tsx` | 预设管理 |
| `app/components/admin/VersionHistory.tsx` | 版本历史组件 |
| `app/components/admin/DiffView.tsx` | diff 对比组件 |
| `app/components/course-rnd/TagPicker.tsx` | 标签多选组件 |
| `app/components/course-rnd/PresetDropdownWithEditor.tsx` | 预设下拉+编辑器 |
| `app/components/course-rnd/GroupedSelect.tsx` | 分组下拉 |

### 修改文件（9 个）

| 文件 | 改动 |
|------|------|
| `app/prisma/schema.prisma` | 新增 5 模型 + CourseRndProject 新字段 |
| `app/lib/ai/prompts.ts` | 重写为 DB 驱动 + fallback |
| `app/lib/permissions.ts` | 新增权限常量 |
| `app/components/Sidebar.tsx` | 新增管理菜单项 |
| `app/components/course-rnd/DirectionInputForm.tsx` | 完整重写 |
| `app/app/globals.css` | 新增约 120 行 CSS |
| `app/app/api/course-rnd/projects/[id]/generate-framework/route.ts` | 使用 resolveTemplate() |
| `app/app/api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate/route.ts` | 同上 |
| `app/app/api/course-rnd/projects/[id]/lessons/[lessonNo]/revise/route.ts` | 同上 |

---

## 9. 测试策略

### 单元测试

| 测试文件 | 内容 |
|---------|------|
| `__tests__/lib/baseline-assembler.test.ts` | 维度匹配、fallback、空 DB |
| `__tests__/lib/template-engine.test.ts` | 变量替换、缺失变量、未知变量 |
| `__tests__/lib/diff-utils.test.ts` | 增删改对比正确性 |

### 集成测试

| 测试文件 | 内容 |
|---------|------|
| `__tests__/api/admin-baselines.test.ts` | CRUD + 版本 + 回滚 + diff + 权限 |
| `__tests__/api/admin-prompt-templates.test.ts` | 同上 |
| `__tests__/api/admin-presets.test.ts` | CRUD + 分类 + 排序 |
| `__tests__/api/course-rnd-form-options.test.ts` | 返回结构正确性 |

---

## 10. 风险与缓解

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| prompt 切换后 AI 输出质量回退 | 高 | 种子数据 = 当前硬编码的精确副本；DB 空时 fallback 到硬编码；A/B 对比验证 |
| markdown 章节解析错误 | 中 | 种子脚本用 heading regex 分割 + 人工验证导入内容 |
| 旧项目自由文本字段不兼容 | 中 | 新字段全部 nullable；表单对未知值显示"自定义: xxx"并允许重新选择 |
| textarea 光标插入变量 bug | 低 | `selectionStart` + `setSelectionRange()` 标准方案，跨浏览器测试 |
| 版本表膨胀 | 低 | 基线/模板编辑频率低（周/月级），短期无需分页 |

---

## 11. 成功标准

- [ ] 管理员可独立编辑所有基线维度
- [ ] 管理员可编辑全部 6 个动作 prompt 模板，支持变量点击插入
- [ ] 每次编辑自动创建版本；版本历史可浏览
- [ ] 任意两个版本可 diff 对比（绿色新增 / 红色删除）
- [ ] 可回滚到任意历史版本
- [ ] rd_manager/teacher 可查看基线和模板（只读）
- [ ] 表单使用数据库驱动的下拉选择：年龄段、级别、组织形态、产出物、课程方向、图片风格
- [ ] 标签多选可用（核心诉求 + 补充约束）
- [ ] 图片风格下拉 → 填入英文提示词 → 可编辑 → 切换时确认弹窗
- [ ] 课程方向下拉 → 填入完整描述 → 可编辑
- [ ] 管理员可维护全部 4 类预设（CRUD + 排序）
- [ ] AI 生成使用数据库 prompt 后输出质量一致
- [ ] DB 无记录时 fallback 到硬编码（零回退）
- [ ] 旧项目自由文本字段正常加载
- [ ] 基线拼装器只注入匹配维度（非全量）
- [ ] 所有 API 权限校验正确
- [ ] `npm run typecheck` 通过
- [ ] `npm test` 全部通过
- [ ] 新代码单元测试覆盖率 80%+
