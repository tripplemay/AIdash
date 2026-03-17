# 课程生成全流程上下文逻辑

> 记录从立项到生成详细方案的完整 prompt 上下文传递链路，用于分析和优化生成质量。

---

## 环节 1：立项（用户填写表单）

用户填写的信息，全部存入 `CourseRndProject` 表：

| 字段 | 示例 | 传给框架生成？ | 传给详细方案生成？ |
|------|------|-------------|-----------------|
| title | AI 故事表达创作课 | 是（userMessage） | 是（userMessage） |
| courseDirection | 用 AI 辅助学生进行故事创作... | 是（userMessage） | 是（userMessage） |
| ageRange | A2 | 是（userMessage + 基线匹配） | 是（userMessage + 基线匹配） |
| level | L2 | 是（userMessage + 基线匹配） | 是（userMessage + 基线匹配） |
| orgForm | S1 | 是（模板引擎基线匹配） | 是（模板引擎基线匹配） |
| deliverableType | P3 | 是（模板引擎基线匹配） | 是（模板引擎基线匹配） |
| deliverableName | 故事介绍页 | 是（模板引擎） | 是（userMessage，字段名 coreDeliverable） |
| lessonCount | 4 | 是（userMessage） | 否 |
| imageStylePrompt | 水彩插画风格... | 是（模板引擎） | 否 |
| roughFramework | 第1课...第2课... | 是（userMessage） | 否 |
| coreNeeds | 强调作品完成度；降低文字负担 | 是（userMessage） | **否 ⚠** |
| constraints | 45分钟课时；4-6人小班 | 是（userMessage） | **否 ⚠** |
| targetAudience | （旧字段，已弃用） | 是（userMessage） | 否 |

此阶段**没有 AI 调用**，纯粹是数据入库。

---

## 环节 2：生成框架

API：`POST /api/course-rnd/projects/[id]/generate-framework`

### System Prompt（模板引擎组装）

```
{{通用基线}}              ← 从 BaselineDoc 读取，约 3000 字
{{年龄段基线}}            ← 按 ageRange=A2 匹配，约 1500 字
{{级别基线}}              ← 按 level=L2 匹配，约 1500 字
{{组织形态基线}}          ← 按 orgForm=S1 匹配
{{产出物基线}}            ← 按 deliverableType=P3 匹配

+

你是一个专业的课程设计助手...
输出格式（JSON）：{ summary, framework: [{ lessonNo, title, overview }] }
注意：标题要简洁有吸引力、概述要体现核心价值和学生产出、课次之间要有递进关系
```

若 DB 无模板，fallback 到 `prompts.ts` 中的 `generateFrameworkPrompt()` 硬编码。

### User Message（代码拼装，route.ts 第 61-71 行）

```
请为以下课程生成框架：

课程对象：${targetAudience ?? "未指定"}
课程方向：${courseDirection ?? "未指定"}
年龄段：${ageRange ?? "未指定"}
级别：${level ?? "未指定"}
课次数：${lessonCount ?? "未指定"}
核心产出物：${coreDeliverable ?? "未指定"}
大致框架：${roughFramework ?? "无"}
核心诉求：${coreNeeds ?? "无"}
补充约束：${constraints ?? "无"}
```

包含 9 个项目字段。

### AI 输出

```json
{
  "summary": "通过 AI 辅助，学生完成从故事灵感到成品的完整创作链",
  "framework": [
    { "lessonNo": 1, "title": "认识AI助手", "overview": "初次接触 AI 工具..." },
    { "lessonNo": 2, "title": "故事角色设计", "overview": "学习用 AI 设计故事角色..." },
    { "lessonNo": 3, "title": "场景搭建", "overview": "用 AI 辅助创建故事场景..." },
    { "lessonNo": 4, "title": "作品整合发布", "overview": "整合所有素材，完成故事介绍页..." }
  ]
}
```

### 数据存储

- `CourseRndDirectionVersion.frameworkJson` — 完整框架 JSON（含 overview）
- `CourseRndDirectionVersion.summary` — 摘要
- `CourseRndDirectionVersion.promptSnapshot` — 完整 system prompt + user message

### 传给下一环节

确认框架后，`generate-plan` API 将 framework 复制到 `CourseRndPlanVersion.planJson`，并为每课创建 `CourseRndLessonDraft`：
- lessonNo ← framework[i].lessonNo
- title ← framework[i].title
- contentData = null
- draftJson = null

**⚠ overview 未传递**：LessonDraft 只存了 lessonNo 和 title，framework 中的 overview 没有存入 draft，也没有在详细方案生成时引用。

---

## 环节 3：生成详细课次方案

API：`POST /api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate`（SSE）

### System Prompt（模板引擎组装）

```
{{通用基线}}              ← 同环节 2
{{年龄段基线}}            ← 同环节 2
{{级别基线}}              ← 同环节 2
{{组织形态基线}}          ← 同环节 2
{{产出物基线}}            ← 同环节 2

+

你是课程设计助手。请根据用户提供的课程信息生成教学方案。
输出要求：只输出 JSON，不要用 markdown 代码块包裹...
JSON 格式如下（70+ 字段的完整结构定义）：
{ title, subtitle, goal, outcome, tags, positioning, conditions, objectives,
  minimum_output, ai_value_quote, ai_rounds[], without_ai[], student_must_do[],
  teacher_prep[], equipment[], reminder, flow[], issues[], outcome_template,
  demo_case, review_questions[], parent_message, hero_image_prompt, ... }
注意：flow 必须 4-6 个环节，issues 至少 4 个，内容要具体实用
```

若 DB 无模板，fallback 到 `regenerate/route.ts` 中的 `SYSTEM_PROMPT` 硬编码常量。

### User Message（代码拼装，route.ts 第 119-128 行）

```
课程信息：
课程标题：${project.title}
年龄段：${project.ageRange ?? "未指定"}
级别：${project.level ?? "未指定"}
核心产出物：${project.coreDeliverable ?? "未指定"}
课程方向：${project.courseDirection ?? "未指定"}

全部课次概览：
第 1 课：认识AI助手
第 2 课：故事角色设计
第 3 课：场景搭建
第 4 课：作品整合发布

请为第 2 课「故事角色设计」生成完整的教学方案。
```

只包含 5 个项目字段 + 课次标题列表。

### AI 输出

`AiLessonOutput` 结构（70+ 字段），经过 `buildContentData()` 转换为 v2 contentData JSON。

### 数据存储

- `CourseRndLessonDraft.draftJson` — 原始 AI 输出（AiLessonOutput）
- `CourseRndLessonDraft.contentData` — 转换后的 v2 格式（hero + 7 sections）
- `CourseRndAiCallLog` — tokens、费用、模型名

---

## 上下文依赖关系图

```
环节1（立项）
  用户填写 → CourseRndProject 字段（12 个有效字段）
                │
                ▼
环节2（框架生成）
  System Prompt = 基线（按 ageRange/level/orgForm/deliverableType 匹配 5 个维度）
                + 框架生成指令
  User Message  = 9 个项目字段（direction, ageRange, level, lessonCount,
                  coreDeliverable, roughFramework, coreNeeds, constraints, targetAudience）
  AI 输出       = summary + framework[{lessonNo, title, overview}]
                │
                │  ⚠ 只传了 title，没传 overview
                │  ⚠ 没传 summary
                ▼
环节3（详细方案生成）
  System Prompt = 基线（同上 5 个维度） + 课次生成指令（70+ 字段 schema）
  User Message  = 5 个项目字段（title, ageRange, level, coreDeliverable, courseDirection）
                + 全部课次标题列表
                + 当前课次标题
  AI 输出       = AiLessonOutput → buildContentData() → v2 contentData
```

---

## 已发现的上下文断裂问题

### 问题 1：框架 overview 丢失

框架阶段 AI 为每课生成了 overview（2-3 句话的概述），但详细方案生成时没有引用。AI 需要仅凭标题重新理解这课的定位和内容方向，可能与框架阶段的设计意图偏离。

**影响**：生成的详细方案可能与用户确认的框架概述不一致。

### 问题 2：详细方案缺少部分项目信息

框架阶段 User Message 包含 9 个字段，详细方案阶段只有 5 个：

| 字段 | 框架阶段 | 详细方案阶段 |
|------|---------|------------|
| title | ✓ | ✓ |
| courseDirection | ✓ | ✓ |
| ageRange | ✓ | ✓ |
| level | ✓ | ✓ |
| coreDeliverable | ✓ | ✓ |
| lessonCount | ✓ | ✗ |
| roughFramework | ✓ | ✗ |
| coreNeeds | ✓ | **✗ ⚠** |
| constraints | ✓ | **✗ ⚠** |
| targetAudience | ✓ | ✗ |

**影响**：用户填写的核心诉求（如"降低文字负担"）和补充约束（如"45分钟课时"）在详细方案生成时 AI 看不到，可能生成不符合这些约束的内容。

### 问题 3：课次间缺少已生成内容的交叉引用

生成第 3 课时，AI 只看到所有课次的标题列表，不知道第 1、2 课已经生成了什么内容。可能导致：
- 课次间内容重复（两课讲了类似的知识点）
- 递进关系断裂（第 3 课没有衔接第 2 课的产出）

**影响**：多课之间的连贯性和递进性可能不足。

---

## 环节 4：修改课次方案

API：`POST /api/course-rnd/projects/[id]/lessons/[lessonNo]/revise`

### System Prompt

同环节 3 的基线 + 修改指令（只输出变更字段 JSON）

### User Message

```
当前方案：
${draft.draftJson}                    ← 当前课次的完整 AiLessonOutput

修改意见（针对 ${targetSection} 板块）：${feedback}
注意：本次修改只涉及「${targetSection}」相关字段，其他字段必须保持不变。

只输出需要修改的字段 JSON。
```

### 数据处理

```
changes = AI 输出的变更字段
merged = { ...currentOutput, ...changes }  ← 浅合并
contentData = buildContentData(merged)     ← 重新组装 v2 格式
```

**注意**：修改阶段的 User Message 也只包含当前课次的 draftJson + 用户反馈，同样缺少项目级别的 coreNeeds、constraints 等上下文。但修改阶段有基线注入（通过 system prompt 的模板引擎），基线中包含了通用约束规则。
