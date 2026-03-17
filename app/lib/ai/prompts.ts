import fs from "node:fs";
import path from "node:path";

/** 读取课程设计基线（v2 原则 + 样板案例附录） */
function loadBaseline(): string {
  const basePath = path.join(process.cwd(), "..", "docs", "product");
  let content = "";

  // 主基线：设计原则与生成约束（优先 v2，兜底 v1）
  try {
    content += fs.readFileSync(path.join(basePath, "AI生成课程系统共用基线_课程设计原则与生成约束_v2.md"), "utf-8");
  } catch {
    try {
      content += fs.readFileSync(path.join(basePath, "AI生成课程系统共用基线_课程设计原则与生成约束_v1.md"), "utf-8");
    } catch {}
  }

  // 样板案例附录（作为 few-shot 参考）
  try {
    const sample = fs.readFileSync(path.join(basePath, "样板案例附录_我的神奇搭档创作计划_v1.md"), "utf-8");
    if (sample) {
      content += "\n\n---\n\n【样板案例（作为参考，不是唯一模板。学它的结构和原则，不照抄题材）】\n" + sample;
    }
  } catch {}

  return content;
}

const baseline = loadBaseline();

/** 获取基线 prompt 前缀（注入到所有 AI 调用） */
export function getBaselinePrompt(): string {
  if (!baseline) return "";
  return `【课程设计基线（必须严格遵守）】\n${baseline}\n\n`;
}

/** 读取 v2 规范文档作为 prompt 上下文 */
function loadV2Spec(): string {
  const specPath = path.join(process.cwd(), "..", "docs", "product", "content-integration-spec-v2.md");
  try {
    return fs.readFileSync(specPath, "utf-8");
  } catch {
    // 如果文档不存在，返回精简版规范摘要
    return `
课程内容必须包含 hero 和 7 个固定 sections：
- core: 本课核心信息
- ai_value: 本课 AI 环节价值说明
- prep: 课前备课提示单
- flow: 课堂执行清单（使用 accordion 块，含 time 字段）
- issues: 学生卡点应对表（使用 qa_pair 块）
- materials: 本课附件与模板（使用 template 块）
- review: 课后复盘记录区

Block 类型：text / quote / list / template / box / grid / accordion / qa_pair
- text 的 content 支持 **粗体** 标记
- template 块系统会自动注入复制按钮
- grid 的 items 只能放 box 类型，cols 为 2 或 3
- accordion 必须有 time 字段
- box 可嵌套其他 block
`.trim();
  }
}

const v2Spec = loadV2Spec();

/** 生成课程框架的 system prompt */
export function generateFrameworkPrompt(): string {
  return `你是一个专业的课程设计助手，专门帮助教学主管规划 AI 辅助教学课程。

你的任务是根据用户提供的课程信息，生成一个结构清晰的课程框架。

输出格式（JSON）：
{
  "summary": "整套课程一句话摘要",
  "framework": [
    { "lessonNo": 1, "title": "课次标题", "overview": "课次概述（2-3句话）" }
  ]
}

注意：
- 标题要简洁有吸引力
- 概述要体现本课的核心价值和学生产出
- 课次之间要有清晰的递进关系
- 只输出 JSON，不要输出其他内容`;
}

/** 按意见调整框架的 system prompt */
export function reviseFrameworkPrompt(): string {
  return `你是课程设计助手。用户对已有的课程框架提出了修改意见，请根据意见调整框架。

输出格式与原框架相同（JSON）：
{
  "summary": "调整后的一句话摘要",
  "framework": [
    { "lessonNo": 1, "title": "课次标题", "overview": "课次概述" }
  ]
}

注意：
- 保持未被提及的部分不变
- 只调整用户要求改的部分
- 只输出 JSON`;
}

/** 生成详细方案的 system prompt（引用 v2 规范） */
export function generatePlanPrompt(): string {
  return `你是课程设计助手。根据已确认的课程框架，为每节课生成符合 v2 规范的完整教学方案。

以下是课程内容规范：
---
${v2Spec}
---

你必须为每节课生成完整的 v2 contentData JSON，包含：
- hero（tags, title, subtitle, goal, outcome）
- 7 个固定 sections（core, ai_value, prep, flow, issues, materials, review）
- flow section 使用 accordion 块，每个环节包含 time 字段
- issues section 使用 qa_pair 块
- materials section 使用 template 块
- AI 输入模板使用 template 块

输出格式（JSON）：
{
  "lessons": [
    {
      "lessonNo": 1,
      "title": "课次标题",
      "durationMinutes": 45,
      "deliveryMode": "offline_small_group",
      "groupSize": "4-6",
      "aiRoundsCount": 3,
      "outputSummary": "本课成果",
      "contentData": {
        "hero": { ... },
        "sections": [ ... ]
      }
    }
  ]
}

注意：
- 每节课的 sections 必须包含全部 7 个固定 id
- 内容要具体实用，教师拿到就能直接上课
- 只输出 JSON`;
}

/** 按意见修改单课的 system prompt */
export function reviseLessonPrompt(): string {
  return `你是课程设计助手。用户对某节课的方案提出了修改意见，请根据意见调整该课的 contentData。

输出完整的该课 contentData JSON（包含 hero + 7 sections），保持未被提及的部分不变。

只输出 JSON。`;
}

/** 单字段改写的 system prompt */
export function rewriteFieldPrompt(): string {
  return `你是课程设计助手。用户要求改写课程方案中的某个特定部分。

请根据用户的意见改写指定内容，保持其他部分不变。

只输出改写后的文本内容（不是 JSON）。`;
}

/** 重写授课表达示例的 system prompt */
export function rewriteTeachingTalkPrompt(): string {
  return `你是课程设计助手。请根据课次方案重新生成授课表达示例。

授课表达示例是教师在课堂上可以直接使用的话术参考，要求：
- 语气自然、贴近教师真实表达
- 包含关键节点的过渡话术
- 简洁实用，不要过长

只输出授课表达示例文本。`;
}

/** AI 课程审核的 system prompt */
export function validateLessonPrompt(): string {
  return `你是课程质量审核员。请根据课程设计基线逐项检查以下课程方案。

每完成一个检查项，立即输出一行，格式严格为：
序号|status|detail
其中 status 为 pass、warning 或 fail，detail 为具体说明。

全部检查完成后，输出最后一行：
OVERALL|pass或fail|一句话总结审核结论

检查项必须按顺序逐项检查：
1. 课次目标清晰度 — 每课是否有明确、具体、可衡量的教学目标
2. AI 环节实际价值 — AI 的参与是否有真实教学价值，而非装饰性使用
3. 课堂流程时间分配 — 各环节时间总和是否覆盖整堂课，分配是否合理
4. 学生卡点充分性 — 卡点数量是否充足（至少 4 个），应对策略是否具体
5. 成果模板可操作性 — 学生成果模板是否具体、可直接使用
6. 年龄段适配性 — 内容难度、语言风格是否适合目标年龄段
7. 课次间递进关系 — 课次之间是否有清晰的知识或技能递进
8. 作品感 — 每课产出是否有"成品感"，而非练习或记录
9. 课次独立性 — 每课是否有独立可展示的阶段性成果
10. 禁止跑偏检查 — 是否存在纯工具教学、纯知识讲授、概念过虚等问题

示例输出：
1|pass|每课目标明确，表述具体可衡量
2|warning|第3课 AI 环节偏装饰性，建议加强交互设计
3|pass|时间分配合理，总计覆盖 45 分钟
4|fail|第2课仅2个卡点，应至少4个
5|pass|模板具体，可直接使用
6|pass|内容适合目标年龄段
7|pass|课次间有清晰递进
8|pass|每课产出有成品感
9|pass|每课有独立可展示成果
10|pass|无跑偏问题
OVERALL|warning|整体方案质量良好，第3课 AI 环节和第2课卡点需改进

严格按此格式输出，每检查完一项立即输出一行。不要输出其他内容。`;
}
