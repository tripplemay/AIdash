import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// ─── Helpers ───

interface SectionPattern {
  regex: RegExp;
  key: string;
  label: string;
  sortOrder: number;
}

interface ParsedSection {
  key: string;
  label: string;
  sortOrder: number;
  content: string;
}

function extractSections(
  content: string,
  patterns: SectionPattern[]
): ParsedSection[] {
  const results: ParsedSection[] = [];

  for (const pattern of patterns) {
    const match = content.match(pattern.regex);
    if (!match || match.index === undefined) {
      console.warn(`  WARNING: pattern not found for key=${pattern.key}`);
      continue;
    }

    const startIdx = match.index;
    // Find next ## heading after the matched one
    const afterMatch = content.slice(startIdx + match[0].length);
    const nextHeading = afterMatch.search(/^## /m);
    const sectionContent =
      nextHeading === -1
        ? content.slice(startIdx).trimEnd()
        : content.slice(startIdx, startIdx + match[0].length + nextHeading).trimEnd();

    results.push({
      key: pattern.key,
      label: pattern.label,
      sortOrder: pattern.sortOrder,
      content: sectionContent,
    });
  }

  return results;
}

function readBaselineFile(filename: string): string {
  const filePath = path.resolve(__dirname, "../../docs/baseline", filename);
  return fs.readFileSync(filePath, "utf-8");
}

// ─── Seed Baselines ───

async function seedBaselines() {
  // 1. General baseline — entire file
  {
    const content = readBaselineFile(
      "AI生成课程系统共用基线_课程设计原则与生成约束_v3.md"
    );
    const doc = await prisma.baselineDoc.upsert({
      where: { type_key: { type: "general", key: "general" } },
      update: { label: "通用基线", content, sortOrder: 0 },
      create: {
        type: "general",
        key: "general",
        label: "通用基线",
        content,
        sortOrder: 0,
      },
    });
    await prisma.baselineDocVersion.upsert({
      where: { baselineDocId_versionNo: { baselineDocId: doc.id, versionNo: 1 } },
      update: { content },
      create: {
        baselineDocId: doc.id,
        versionNo: 1,
        content,
        editedById: null,
        editSummary: "系统初始导入",
      },
    });
    console.log("  [general] 通用基线");
  }

  // 2. Age baselines
  {
    const content = readBaselineFile("课程生成系统年龄段基线_v1.1.md");
    const sections = extractSections(content, [
      { regex: /^## 四、A1/m, key: "A1", label: "A1｜6-7岁 启蒙段", sortOrder: 1 },
      { regex: /^## 五、A2/m, key: "A2", label: "A2｜8-9岁 基础段", sortOrder: 2 },
      { regex: /^## 六、A3/m, key: "A3", label: "A3｜10-12岁 主力段", sortOrder: 3 },
      { regex: /^## 七、A4/m, key: "A4", label: "A4｜13-15岁 进阶段", sortOrder: 4 },
    ]);
    for (const s of sections) {
      const doc = await prisma.baselineDoc.upsert({
        where: { type_key: { type: "age", key: s.key } },
        update: { label: s.label, content: s.content, sortOrder: s.sortOrder },
        create: {
          type: "age",
          key: s.key,
          label: s.label,
          content: s.content,
          sortOrder: s.sortOrder,
        },
      });
      await prisma.baselineDocVersion.upsert({
        where: { baselineDocId_versionNo: { baselineDocId: doc.id, versionNo: 1 } },
        update: { content: s.content },
        create: {
          baselineDocId: doc.id,
          versionNo: 1,
          content: s.content,
          editedById: null,
          editSummary: "系统初始导入",
        },
      });
      console.log(`  [age] ${s.label}`);
    }
  }

  // 3. Level baselines
  {
    const content = readBaselineFile("课程生成系统级别基线_v1.md");
    const sections = extractSections(content, [
      { regex: /^## 三、L1/m, key: "L1", label: "L1｜AI 启蒙使用", sortOrder: 1 },
      { regex: /^## 四、L2/m, key: "L2", label: "L2｜AI 基础应用", sortOrder: 2 },
      { regex: /^## 五、L3/m, key: "L3", label: "L3｜AI 结构化创作", sortOrder: 3 },
      { regex: /^## 六、L4/m, key: "L4", label: "L4｜AI 多轮协作与优化", sortOrder: 4 },
    ]);
    for (const s of sections) {
      const doc = await prisma.baselineDoc.upsert({
        where: { type_key: { type: "level", key: s.key } },
        update: { label: s.label, content: s.content, sortOrder: s.sortOrder },
        create: {
          type: "level",
          key: s.key,
          label: s.label,
          content: s.content,
          sortOrder: s.sortOrder,
        },
      });
      await prisma.baselineDocVersion.upsert({
        where: { baselineDocId_versionNo: { baselineDocId: doc.id, versionNo: 1 } },
        update: { content: s.content },
        create: {
          baselineDocId: doc.id,
          versionNo: 1,
          content: s.content,
          editedById: null,
          editSummary: "系统初始导入",
        },
      });
      console.log(`  [level] ${s.label}`);
    }
  }

  // 4. Organization form baselines
  {
    const content = readBaselineFile("课程生成系统课程组织形态基线_v1.1.md");
    const sections = extractSections(content, [
      { regex: /^## 1\. 单课闭环型（S1）/m, key: "S1", label: "S1｜单课闭环型", sortOrder: 1 },
      { regex: /^## 2\. 系列项目型（S2）/m, key: "S2", label: "S2｜系列项目型", sortOrder: 2 },
    ]);
    for (const s of sections) {
      const doc = await prisma.baselineDoc.upsert({
        where: { type_key: { type: "org_form", key: s.key } },
        update: { label: s.label, content: s.content, sortOrder: s.sortOrder },
        create: {
          type: "org_form",
          key: s.key,
          label: s.label,
          content: s.content,
          sortOrder: s.sortOrder,
        },
      });
      await prisma.baselineDocVersion.upsert({
        where: { baselineDocId_versionNo: { baselineDocId: doc.id, versionNo: 1 } },
        update: { content: s.content },
        create: {
          baselineDocId: doc.id,
          versionNo: 1,
          content: s.content,
          editedById: null,
          editSummary: "系统初始导入",
        },
      });
      console.log(`  [org_form] ${s.label}`);
    }
  }

  // 5. Deliverable baselines
  {
    const content = readBaselineFile("课程生成系统产出物形态基线_v1.1.md");
    const deliverablePatterns: SectionPattern[] = [
      { regex: /^## \d+\. P1｜/m, key: "P1", label: "P1｜档案类", sortOrder: 1 },
      { regex: /^## \d+\. P2｜/m, key: "P2", label: "P2｜计划类", sortOrder: 2 },
      { regex: /^## \d+\. P3｜/m, key: "P3", label: "P3｜故事类", sortOrder: 3 },
      { regex: /^## \d+\. P4｜/m, key: "P4", label: "P4｜空间类", sortOrder: 4 },
      { regex: /^## \d+\. P5｜/m, key: "P5", label: "P5｜发布类", sortOrder: 5 },
      { regex: /^## \d+\. P6｜/m, key: "P6", label: "P6｜图片类", sortOrder: 6 },
      { regex: /^## \d+\. P7｜/m, key: "P7", label: "P7｜漫画类", sortOrder: 7 },
      { regex: /^## \d+\. P8｜/m, key: "P8", label: "P8｜音乐类", sortOrder: 8 },
      { regex: /^## \d+\. P9｜/m, key: "P9", label: "P9｜动画类", sortOrder: 9 },
      { regex: /^## \d+\. P10｜/m, key: "P10", label: "P10｜游戏类", sortOrder: 10 },
      { regex: /^## \d+\. P11｜/m, key: "P11", label: "P11｜互动展示类", sortOrder: 11 },
    ];
    const sections = extractSections(content, deliverablePatterns);
    for (const s of sections) {
      const doc = await prisma.baselineDoc.upsert({
        where: { type_key: { type: "deliverable", key: s.key } },
        update: { label: s.label, content: s.content, sortOrder: s.sortOrder },
        create: {
          type: "deliverable",
          key: s.key,
          label: s.label,
          content: s.content,
          sortOrder: s.sortOrder,
        },
      });
      await prisma.baselineDocVersion.upsert({
        where: { baselineDocId_versionNo: { baselineDocId: doc.id, versionNo: 1 } },
        update: { content: s.content },
        create: {
          baselineDocId: doc.id,
          versionNo: 1,
          content: s.content,
          editedById: null,
          editSummary: "系统初始导入",
        },
      });
      console.log(`  [deliverable] ${s.label}`);
    }
  }

  // 6. Matrix — entire file
  {
    const content = readBaselineFile("课程生成系统分层生成规则矩阵_v1.md");
    const doc = await prisma.baselineDoc.upsert({
      where: { type_key: { type: "matrix", key: "matrix" } },
      update: { label: "分层生成规则矩阵", content, sortOrder: 0 },
      create: {
        type: "matrix",
        key: "matrix",
        label: "分层生成规则矩阵",
        content,
        sortOrder: 0,
      },
    });
    await prisma.baselineDocVersion.upsert({
      where: { baselineDocId_versionNo: { baselineDocId: doc.id, versionNo: 1 } },
      update: { content },
      create: {
        baselineDocId: doc.id,
        versionNo: 1,
        content,
        editedById: null,
        editSummary: "系统初始导入",
      },
    });
    console.log("  [matrix] 分层生成规则矩阵");
  }

  // 7. Slideshow baseline — inline content (no file)
  {
    const content = `# 课件生成通用基线

## 学生视角转写原则

### 语言风格（按年龄段）
- **A1（6-7岁）**：简短句子，多用感叹号和问号，大量使用"我们""一起"等词汇，配合emoji概念（如星星、火箭），避免抽象概念
- **A2（8-9岁）**：清晰简洁的指令，可使用简单的因果关系，鼓励"试一试""想一想"，保持趣味性
- **A3（10-11岁）**：可引入简单的专业术语（需附解释），允许更长的段落，鼓励独立思考和表达观点
- **A4（12岁+）**：接近日常交流语言，可使用更复杂的句式和概念，注重启发而非简单指令

### 通用转写规则
1. 教学目标 → 转化为"今天我们要..."或"完成后你将..."的学生期待语
2. 教师话术 → 不直接展示，转化为引导性问题或任务说明
3. AI 模板 → 转化为"现在轮到你了！"的操作指引，保留核心 prompt 内容
4. 学生产出模板 → 转化为创作任务说明，突出"你的作品"的归属感
5. 教师准备事项/设备要求 → 不进入学生 PPT
6. 学生卡点 → 转化为"小提示"或"如果遇到困难..."的友好提示

## 课堂展示排版原则

### 信息密度
- 每页最多 1 个核心信息点
- 正文不超过 50 字（低龄段不超过 30 字）
- 要点列表每页不超过 4 项
- 标题简短有力，不超过 10 个字

### 图文比例
- 封面页：标题为主，留出大面积视觉空间
- 内容页：文字占 60%，预留 40% 图片空间
- 互动页：操作指引为主，步骤清晰
- 展示页：引导语简洁，留出展示空间

## PPT 页面节奏

### 节奏控制
1. 封面页（1页）→ 引起兴趣
2. 导入/热身（1-2页）→ 激活已有经验
3. 核心内容（3-5页）→ 每个知识点/技能点一页
4. 互动/实操（3-5页）→ 任务说明 + 操作步骤
5. 展示/分享（1-2页）→ 成果展示引导
6. 总结/结束（1页）→ 回顾收获 + 预告

### 过渡设计
- 环节之间用过渡页或引导问题衔接
- 避免内容跳跃，保持学生注意力的连贯性
- 互动环节前用激励语引导（"接下来是最精彩的部分！"）

## 课件配图原则

### 何时需要配图
- 封面页：必须配图（课程主视觉）
- 结束页：必须配图（课程回顾氛围）
- 引导观察的页面（如"看看这些作品"）：需要配图帮助学生理解
- 展示成果的页面（如"你的作品应该像这样"）：需要配图提供视觉参考
- 激发兴趣的页面（如课程导入、新概念引入）：需要配图吸引注意力
- 场景描述的页面（如故事情境、实验场景）：需要配图营造氛围

### 何时不需要配图
- 纯操作指引页面（如"打开工具，输入以下内容"）
- 纯文字任务说明页面（如"按照以下步骤完成"）
- 要点列表/总结页面（文字已足够清晰）
- 过渡页/引导问题页面（简短文字即可）

### imagePrompt 描述规范
- 使用英文撰写，描述具体可视化场景
- 匹配课程目标年龄段的视觉复杂度
- 描述应与当前页面教学内容直接相关
- 避免抽象概念，描述具体的人物、物品、场景
- 不要包含文字在图片中（no text in the image）
- 示例："A group of children aged 8-9 excitedly looking at colorful paintings on a classroom wall, cartoon style, bright colors"`;

    const doc = await prisma.baselineDoc.upsert({
      where: { type_key: { type: "slideshow", key: "slideshow_general" } },
      update: { label: "课件生成通用基线", content, sortOrder: 0 },
      create: {
        type: "slideshow",
        key: "slideshow_general",
        label: "课件生成通用基线",
        content,
        sortOrder: 0,
      },
    });
    await prisma.baselineDocVersion.upsert({
      where: { baselineDocId_versionNo: { baselineDocId: doc.id, versionNo: 1 } },
      update: { content },
      create: {
        baselineDocId: doc.id,
        versionNo: 1,
        content,
        editedById: null,
        editSummary: "系统初始导入",
      },
    });
    console.log("  [slideshow] 课件生成通用基线");
  }
}

// ─── Seed Prompt Templates ───

const PROMPT_TEMPLATES: Array<{
  actionKey: string;
  actionLabel: string;
  content: string;
}> = [
  {
    actionKey: "generate_framework",
    actionLabel: "生成课程框架",
    content: `你是一个专业的课程设计助手，专门帮助教学主管规划 AI 辅助教学课程。

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
- 只输出 JSON，不要输出其他内容

# 课程设计基线（请严格遵循）
{{通用基线}}
{{年龄段基线}}
{{级别基线}}
{{组织形态基线}}
{{产出物基线}}
{{分层规则矩阵}}`,
  },
  {
    actionKey: "revise_framework",
    actionLabel: "修订课程框架",
    content: `你是课程设计助手。用户对已有的课程框架提出了修改意见，请根据意见调整框架。

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
- 只输出 JSON

# 课程设计基线（请严格遵循）
{{通用基线}}
{{年龄段基线}}
{{级别基线}}
{{组织形态基线}}
{{产出物基线}}
{{分层规则矩阵}}`,
  },
  {
    actionKey: "regenerate_lesson",
    actionLabel: "生成课次方案",
    content: `你是课程设计助手。请根据用户提供的课程信息生成教学方案。

输出要求：只输出 JSON，不要用 markdown 代码块包裹，不要输出其他文字。

JSON 格式如下（所有字段必填）：
{
  "title": "课次标题",
  "subtitle": "一句话描述本课",
  "goal": "一句话目标",
  "outcome": "核心产出物名称",
  "tags": ["标签1", "标签2"],
  "positioning": "本课定位（一段话）",
  "conditions": ["适用条件1", "适用条件2"],
  "objectives": ["核心目标1", "核心目标2", "核心目标3"],
  "minimum_output": ["最小成果1", "最小成果2"],
  "ai_value_quote": "一句话说明 AI 在本课中的价值",
  "ai_rounds": [
    { "name": "AI 环节名称", "value": "该环节 AI 的作用说明" }
  ],
  "without_ai": ["没有 AI 学生会遇到的困难1", "困难2"],
  "student_must_do": ["学生仍需自己完成的事1", "事2"],
  "teacher_prep": ["教师准备事项1", "事项2"],
  "equipment": ["设备要求1", "要求2"],
  "reminder": "给教师的一句核心提醒",
  "flow": [
    {
      "title": "环节名称",
      "time": "0-5 分钟",
      "goal": "本环节目标",
      "actions": "教师要做什么（一段话）",
      "teacher_says": ["教师可以说的话1", "话2"],
      "ai_template": { "label": "AI 模板名称", "content": "学生输入给 AI 的模板文本" },
      "checkpoint": "本环节结束时要看到什么"
    }
  ],
  "issues": [
    { "question": "学生卡点描述", "answer": "教师应对话术" }
  ],
  "outcome_template": "学生成果模板的完整文本（含填空项）",
  "demo_case": {
    "name": "示范案例名称",
    "details": ["案例细节1", "细节2"]
  },
  "review_questions": ["课后复盘问题1", "问题2"],
  "parent_message": "家长沟通简版话术（一段话）",
  "hero_image_prompt": "课次主图的英文描述（用于 AI 绘画，描述一个适合儿童教育的可爱插画场景，和课程主题相关）",
  "illustration_prompt": "课内插图的英文描述（用于 AI 绘画，描述教师示范案例的可视化场景）",
  "template_image_prompt": "作品模板图的英文描述（用于 AI 绘画，描述学生成果作品的示意图）"
}

注意：
- flow 必须包含 4-6 个环节，覆盖整堂课时间
- 不是每个环节都有 ai_template，没有的设为 null
- checkpoint 没有的设为 null
- issues 至少 4 个
- 内容要具体实用，教师拿到就能直接上课

# 课程设计基线（请严格遵循）
{{通用基线}}
{{年龄段基线}}
{{级别基线}}
{{组织形态基线}}
{{产出物基线}}
{{分层规则矩阵}}`,
  },
  {
    actionKey: "revise_lesson",
    actionLabel: "修改课次方案",
    content: `你是课程设计助手。用户会提供当前课程方案和修改意见。

你的任务：只输出需要修改的字段和新值，不要输出未变更的字段。

输出要求：只输出 JSON，不要用 markdown 代码块包裹，不要输出其他文字。

示例 1 — 用户说"换一个更有吸引力的标题"：
{ "title": "新标题" }

示例 2 — 用户说"增加一个关于网络安全的卡点"：
{ "issues": [原有卡点1, 原有卡点2, 原有卡点3, 原有卡点4, {"question":"新卡点","answer":"应对方法"}] }

示例 3 — 用户说"第三个环节时间太短，延长到15分钟"：
{ "flow": [原有环节1, 原有环节2, {"title":"环节3","time":"20-35 分钟",...改动后的完整环节}, 原有环节4, ...] }

注意：
- 只输出变更的字段
- 如果修改的是数组中的某一项（如 flow 的某个环节），输出完整数组（包含未变更的项）
- 字段名必须和原方案一致

# 课程设计基线（请严格遵循）
{{通用基线}}
{{年龄段基线}}
{{级别基线}}
{{组织形态基线}}
{{产出物基线}}
{{分层规则矩阵}}`,
  },
  {
    actionKey: "rewrite_field",
    actionLabel: "改写指定字段",
    content: `你是课程设计助手。用户要求改写课程方案中的某个特定部分。

请根据用户的意见改写指定内容，保持其他部分不变。

只输出改写后的文本内容（不是 JSON）。

# 课程设计基线（请严格遵循）
{{通用基线}}
{{年龄段基线}}
{{级别基线}}
{{组织形态基线}}
{{产出物基线}}
{{分层规则矩阵}}`,
  },
  {
    actionKey: "rewrite_teaching_talk",
    actionLabel: "生成教学话术",
    content: `你是课程设计助手。请根据课次方案重新生成授课表达示例。

授课表达示例是教师在课堂上可以直接使用的话术参考，要求：
- 语气自然、贴近教师真实表达
- 包含关键节点的过渡话术
- 简洁实用，不要过长

只输出授课表达示例文本。

# 课程设计基线（请严格遵循）
{{通用基线}}
{{年龄段基线}}
{{级别基线}}
{{组织形态基线}}
{{产出物基线}}
{{分层规则矩阵}}`,
  },
  {
    actionKey: "validate_lesson",
    actionLabel: "课程审核",
    content: `你是课程质量审核员。请根据课程设计基线逐项检查以下课程方案。

每完成一个检查项，立即输出一行，格式严格为：
序号|检查项名称|status|detail
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
11. AI 工具落地可执行性 — 每个 AI 环节是否映射到了具体工具或平台（tool_plan 是否存在且完整），工具操作方式是否适配目标年龄段（低龄应为教师投屏或小组协作），各 AI 环节的 tool_usage 是否完整（tool_type、tool_name、entry_method、operator、student_action、fallback）
12. 工具降级与备选方案 — tool_plan 中每种工具类型是否有至少 1 个备选工具，各 AI 环节是否有具体降级方案，整课级 fallback 是否可执行而非空话，降级方案是否对不同工具不可用场景有区分

示例输出：
1|课次目标清晰度|pass|每课目标明确，表述具体可衡量
2|AI 环节实际价值|warning|第3课 AI 环节偏装饰性，建议加强交互设计
3|课堂流程时间分配|pass|时间分配合理，总计覆盖 45 分钟
4|学生卡点充分性|fail|第2课仅2个卡点，应至少4个
5|成果模板可操作性|pass|模板具体，可直接使用
6|年龄段适配性|pass|内容适合目标年龄段
7|课次间递进关系|pass|课次间有清晰递进
8|作品感|pass|每课产出有成品感
9|课次独立性|pass|每课有独立可展示成果
10|禁止跑偏检查|pass|无跑偏问题
11|AI 工具落地可执行性|pass|所有 AI 环节均有 tool_plan 和 tool_usage，工具选择合理
12|工具降级与备选方案|warning|第2课降级方案过于笼统，建议针对对话 AI 和绘画 AI 分别给出替代方案
OVERALL|warning|整体方案质量良好，第3课 AI 环节和第2课卡点及降级方案需改进

严格按此格式输出，每检查完一项立即输出一行。不要输出其他内容。

# 课程设计基线（请严格遵循）
{{通用基线}}
{{年龄段基线}}
{{级别基线}}
{{组织形态基线}}
{{产出物基线}}
{{分层规则矩阵}}`,
  },
  {
    actionKey: "generate_title",
    actionLabel: "生成课程名称",
    content: `请为以下课程生成一个简洁有吸引力的项目名称，只输出名称文字，不要输出其他内容。
课程方向：{{课程方向}}
目标年龄段：{{年龄段标签}}
难度级别：{{级别标签}}`,
  },
  {
    actionKey: "package_cover",
    actionLabel: "课程包封面图",
    content: `Create a colorful, engaging educational course cover illustration.
Course: "{{项目标题}}"
Direction: {{课程方向}}
Target audience: children, {{年龄段标签}}
Style: {{图片风格描述}}
The illustration should match the age group — use age-appropriate visual complexity, color palette, and character design.
No text on the image.`,
  },
  {
    actionKey: "generate_slideshow",
    actionLabel: "生成课件",
    content: `你是一个专业的课件设计师，擅长将教师备课内容转化为学生课堂展示用的 PPT 课件。

你的任务：将下面的教师备课内容（教学目标、流程、话术、AI 模板等），转写为学生在课堂上看到的展示内容。

## 转写原则
- 所有内容从"学生视角"撰写，语气亲切、鼓励、有趣
- 根据目标年龄段调整语言复杂度和用词
- 教师话术和备课提示不直接展示，转化为学生能理解的引导语
- 每页信息量适中，避免文字堆砌
- 保持课堂节奏感，内容有递进

## PPT 主题风格
{{主题配置}}

## 可用版式列表
你必须从以下版式中选择每页的 layout 值：

{{可用版式}}

## 输出格式（JSON）
只输出 JSON，不要用 markdown 代码块包裹，不要输出其他文字。

{
  "slides": [
    {
      "type": "cover",
      "layout": "cover_fullimage",
      "title": "课程名称",
      "subtitle": "本课副标题",
      "body": null,
      "bullets": null,
      "imagePrompt": "A vibrant classroom scene with children discovering the topic, cartoon style, bright colors, no text",
      "notes": "教师参考备注"
    },
    {
      "type": "content",
      "layout": "content_image_right",
      "title": "页面标题",
      "subtitle": null,
      "body": "正文内容",
      "bullets": ["要点1", "要点2"],
      "imagePrompt": "具体场景描述（英文），或 null 表示不需要图片",
      "notes": "教师参考备注"
    },
    {
      "type": "content",
      "layout": "content_text_only",
      "title": "纯文字页面标题",
      "subtitle": null,
      "body": "不需要图片时选择纯文字版式",
      "bullets": ["要点1"],
      "imagePrompt": null,
      "notes": "教师参考备注"
    },
    {
      "type": "interaction",
      "layout": "interaction_card",
      "title": "互动环节标题",
      "subtitle": "任务说明",
      "body": "学生操作指引",
      "bullets": null,
      "imagePrompt": null,
      "notes": "教师参考备注"
    },
    {
      "type": "showcase",
      "layout": "showcase_centered",
      "title": "展示环节标题",
      "subtitle": null,
      "body": "展示引导语",
      "bullets": ["展示要求1", "展示要求2"],
      "imagePrompt": "Children proudly showing their creative works, cartoon style, no text",
      "notes": "教师参考备注"
    },
    {
      "type": "ending",
      "layout": "ending_summary",
      "title": "课程总结",
      "subtitle": null,
      "body": "总结语",
      "bullets": ["收获1", "收获2"],
      "imagePrompt": "A cheerful closing scene matching the course theme, cartoon style, no text",
      "notes": "教师参考备注"
    }
  ]
}

## layout 选择规则
- 每页必须指定 layout，值为上方可用版式列表中的 key
- layout 的 type 必须与 slide 的 type 匹配（如 cover 类型只能用 cover_* 版式）
- 有 imagePrompt 的页面应选择含图片占位符的版式（如 content_image_right、content_image_bottom）
- 无 imagePrompt 的页面应选择纯文字版式（如 content_text_only）
- 同类型的不同页面应尽量选择不同版式，增加视觉多样性

## imagePrompt 规则
- 封面页（cover）和结束页（ending）：必须填写 imagePrompt
- 中间页面（content/interaction/showcase）：根据内容自主判断是否需要配图
  - 需要配图的场景：引导观察、展示成果、激发兴趣、场景描述
  - 不需要配图的场景：纯操作指引、纯文字任务说明、要点列表
- imagePrompt 用英文撰写，描述具体可视化场景，匹配目标年龄段
- 不需要图片的页面将 imagePrompt 设为 null

## 注意事项
- 总页数控制在 10-20 页
- notes 字段写给教师看的参考备注（不会展示给学生）
- 确保每个教学环节都有对应的 PPT 页面

# 课件生成基线（请严格遵循）
{{课件基线}}

# 课程设计基线（参考）
{{通用基线}}
{{年龄段基线}}

# 当前课次信息
课程名称：{{项目标题}}
课次号：{{当前课次号}}
课次标题：{{当前课次标题}}
目标年龄段：{{年龄段标签}}
难度级别：{{级别标签}}

# 课次完整备课内容
{{课次完整内容}}`,
  },
];

async function seedPromptTemplates() {
  for (const t of PROMPT_TEMPLATES) {
    // 只创建不更新：已有模板跳过，保留管理员的修改
    const existing = await prisma.promptTemplate.findUnique({
      where: { actionKey: t.actionKey },
    });
    if (existing) {
      console.log(`  [prompt] ${t.actionKey} — 已存在，跳过`);
      continue;
    }

    const template = await prisma.promptTemplate.create({
      data: {
        actionKey: t.actionKey,
        actionLabel: t.actionLabel,
        content: t.content,
      },
    });
    await prisma.promptTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNo: 1,
        content: t.content,
        editedById: null,
        editSummary: "系统初始导入",
      },
    });
    console.log(`  [prompt] ${t.actionKey} — ${t.actionLabel}（新建）`);
  }
}

// ─── Seed Presets ───

async function seedPresets() {
  const presets: Array<{
    category: string;
    items: Array<{ name: string; value: string }>;
  }> = [
    {
      category: "course_direction",
      items: [
        {
          name: "AI 辅助故事创作",
          value:
            "用 AI 辅助学生进行故事创作，包括角色设计、情节构思、场景描绘，引导学生借助 AI 完成从灵感到成品的完整创作链",
        },
        {
          name: "AI 辅助科学探究",
          value:
            "用 AI 辅助学生进行科学探究活动，从提出假设到设计实验方案，借助 AI 进行数据分析和可视化呈现",
        },
        {
          name: "AI 辅助艺术设计",
          value:
            "用 AI 辅助学生进行视觉艺术创作，从灵感采集到作品设计，学会将创意想法转化为具体的视觉作品",
        },
        {
          name: "AI 辅助音乐创作",
          value:
            "用 AI 辅助学生进行音乐创作，从旋律构思到编曲制作，体验用 AI 工具将音乐灵感转化为可听的作品",
        },
        {
          name: "AI 辅助游戏设计",
          value:
            "用 AI 辅助学生设计游戏，从规则构思到原型搭建，学会用 AI 快速生成游戏素材和逻辑框架",
        },
        {
          name: "AI 辅助表达写作",
          value:
            "用 AI 辅助学生进行多形式写作表达，从观点梳理到文章成型，借助 AI 提升表达的结构性和完整度",
        },
      ],
    },
    {
      category: "image_style",
      items: [
        {
          name: "扁平可爱风",
          value:
            "扁平插画风格，可爱角色，明亮柔和配色，简洁图形，适合儿童，细节精简，线条干净",
        },
        {
          name: "水彩绘本风",
          value:
            "水彩插画风格，绘本质感，柔和色调，轻柔笔触，梦幻氛围，儿童绘本美术风格",
        },
        {
          name: "手绘涂鸦风",
          value:
            "手绘涂鸦风格，素描线条，活泼有趣，彩色马克笔质感，笔记本纸张纹理",
        },
        {
          name: "3D 卡通风",
          value:
            "3D 卡通渲染，皮克斯风格，鲜艳色彩，圆润造型，柔和光影，欢快角色",
        },
        {
          name: "科技未来风",
          value:
            "未来科技风数字艺术，全息元素，深色背景霓虹点缀，科技界面感，现代简洁",
        },
        {
          name: "像素复古风",
          value:
            "像素艺术风格，复古游戏美感，16 位色彩，方块角色，怀旧趣味",
        },
        {
          name: "纸艺拼贴风",
          value:
            "纸艺拼贴风格，剪纸图形，多层纸张纹理，手工感，彩色卡纸质感",
        },
        {
          name: "日系清新风",
          value:
            "日系动漫插画风格，干净线稿，柔和赛璐璐上色，淡色背景，角色表情丰富",
        },
      ],
    },
    {
      category: "core_needs_tag",
      items: [
        { name: "强调作品完成度", value: "确保每节课学生产出可见的、有完成感的作品成果，作品要有成品感而非练习痕迹" },
        { name: "强调动手实操", value: "课程以动手实操为主，减少讲授时间，学生在做中学，每个环节都有明确的操作任务" },
        { name: "强化同伴协作", value: "设计同伴互动环节，如结对创作、小组讨论、作品互评，让学生在协作中学习" },
        { name: "降低文字负担", value: "目标学生文字能力有限，应降低文字输入和阅读负担，优先使用图片、语音、拖拽等多模态方式进行创作" },
        { name: "增加 AI 互动环节", value: "增加学生与 AI 工具直接互动的环节，让学生体验 AI 辅助创作的完整过程，而非教师演示" },
        { name: "适配零基础学生", value: "假设学生没有任何相关基础，需要从最基本的概念和操作开始引导，提供充分的示范和脚手架" },
        { name: "每课独立成果", value: "每节课必须有独立的、可展示的阶段性成果，不依赖后续课程，学生当堂就能看到自己的产出" },
        { name: "强调创意表达", value: "鼓励学生自由发挥创意，避免统一模板化的产出，课程设计应为创意表达留出空间和选择余地" },
        { name: "控制课堂节奏", value: "严格控制每个环节的时间分配，设置明确的时间节点和过渡话术，防止某个环节拖堂影响整体进度" },
      ],
    },
    {
      category: "constraints_tag",
      items: [
        { name: "45 分钟课时", value: "课程时长为 45 分钟，所有环节必须在 45 分钟内完成，合理分配每个环节时间" },
        { name: "60 分钟课时", value: "课程时长为 60 分钟，可适当增加实操和展示环节的时间" },
        { name: "90 分钟课时", value: "课程时长为 90 分钟，可设计更深入的创作环节和充分的分享展示时间" },
        { name: "4-6 人小班", value: "适配 4-6 人线下小班教学，确保每个学生都有充分的表达和展示机会，教师能关注到每个学生" },
        { name: "线上授课", value: "课程为线上授课模式，需考虑屏幕共享、在线协作工具的使用，避免依赖线下物理操作" },
        { name: "无电脑环境", value: "教学环境没有电脑，学生使用平板设备，需考虑平板操作的便利性和触屏交互方式" },
        { name: "禁止纯工具教学", value: "课程不能变成工具操作教程，AI 工具的使用必须服务于创作目标，而非为了教工具而教工具" },
        { name: "禁止纯知识讲授", value: "课程不能变成纯知识讲授课，每节课必须有学生动手产出作品的环节，知识融入实操中" },
        { name: "避免同质化", value: "课次之间的任务设计要有差异化，避免每节课都是想一想、用 AI 生成、展示的重复套路" },
        { name: "需要家长配合", value: "部分环节需要家长在课后配合完成，如素材收集、作品打印展示等，需在教案中明确标注" },
        { name: "需要提前准备素材", value: "教师需要在课前准备好教学素材（如示范作品、参考图片、模板文件），需在备课提示中列出清单" },
      ],
    },
    {
      category: "image_composition",
      items: [
        {
          name: "课次标题图构图引导",
          value: "将所有主要元素集中在画面中央的水平带状区域内，画面上方和下方使用简洁的背景、渐变或留白填充，确保即使画面上下各裁切 30% 后，中央区域仍保留完整的核心内容和主体人物。避免在画面顶部和底部放置重要元素。",
        },
      ],
    },
    {
      category: "slideshow_theme",
      items: [
        {
          name: "科技蓝",
          value: JSON.stringify({
            description: "蓝紫渐变、简洁几何，适合 STEAM/编程/AI 类课程",
            templateDir: "tech-blue",
            background: "#0F1B2D",
            titleColor: "#7CB3FF",
            bodyColor: "#E0E8F0",
            accentColor: "#5B8DEF",
            titleFont: "Microsoft YaHei",
            bodyFont: "Microsoft YaHei",
            titleFontSize: 36,
            bodyFontSize: 18,
            layoutStyle: "tech",
          }),
        },
        {
          name: "自然绿",
          value: JSON.stringify({
            description: "绿色系、柔和插画风，适合自然探索/生态类课程",
            templateDir: "nature-green",
            background: "#F5FAF0",
            titleColor: "#2D6A4F",
            bodyColor: "#344E41",
            accentColor: "#52B788",
            titleFont: "Microsoft YaHei",
            bodyFont: "Microsoft YaHei",
            titleFontSize: 36,
            bodyFontSize: 18,
            layoutStyle: "nature",
          }),
        },
        {
          name: "创意橙",
          value: JSON.stringify({
            description: "暖色活泼、圆角卡片，适合低龄段艺术/手工类课程",
            templateDir: "creative-orange",
            background: "#FFF8F0",
            titleColor: "#E85D04",
            bodyColor: "#4A3728",
            accentColor: "#F48C06",
            titleFont: "Microsoft YaHei",
            bodyFont: "Microsoft YaHei",
            titleFontSize: 36,
            bodyFontSize: 18,
            layoutStyle: "creative",
          }),
        },
        {
          name: "简约白",
          value: JSON.stringify({
            description: "黑白灰、大留白，通用/高龄段/严肃主题",
            templateDir: "minimal-white",
            background: "#FFFFFF",
            titleColor: "#1A1A2E",
            bodyColor: "#333333",
            accentColor: "#4361EE",
            titleFont: "Microsoft YaHei",
            bodyFont: "Microsoft YaHei",
            titleFontSize: 36,
            bodyFontSize: 18,
            layoutStyle: "minimal",
          }),
        },
      ],
    },
    {
      category: "ai_action_registry",
      items: [
        { name: "generate_framework", value: JSON.stringify({ label: "生成课程框架", type: "text" }) },
        { name: "revise_framework", value: JSON.stringify({ label: "调整框架", type: "text" }) },
        { name: "regenerate_lesson", value: JSON.stringify({ label: "生成/重新生成课次", type: "text" }) },
        { name: "revise_lesson", value: JSON.stringify({ label: "按意见修改课次", type: "text" }) },
        { name: "rewrite_field", value: JSON.stringify({ label: "单字段改写", type: "text" }) },
        { name: "validate_lesson", value: JSON.stringify({ label: "课次审核", type: "text" }) },
        { name: "generate_slideshow", value: JSON.stringify({ label: "生成课件", type: "text" }) },
        { name: "slideshow_image", value: JSON.stringify({ label: "课件配图", type: "image" }) },
        { name: "lesson_cover", value: JSON.stringify({ label: "课次封面图", type: "image" }) },
        { name: "lesson_illustration", value: JSON.stringify({ label: "课内插图", type: "image" }) },
        { name: "package_cover", value: JSON.stringify({ label: "课程包封面图", type: "image" }) },
        { name: "chat", value: JSON.stringify({ label: "AI 对话", type: "text" }) },
      ],
    },
    {
      category: "slideshow_layout",
      items: (() => {
        const themes = [
          { dir: "tech-blue", themeKey: "科技蓝" },
          { dir: "nature-green", themeKey: "自然绿" },
          { dir: "creative-orange", themeKey: "创意橙" },
          { dir: "minimal-white", themeKey: "简约白" },
        ];
        const layouts = [
          { key: "cover_fullimage", label: "封面 — 全屏背景图", type: "cover", slideIndex: 1, placeholders: { title: "TitleShape", subtitle: "SubtitleShape", image: "BackgroundImage" }, imageOrientation: "landscape", description: "全屏背景图 + 半透明遮罩 + 居中大标题" },
          { key: "cover_gradient", label: "封面 — 渐变装饰", type: "cover", slideIndex: 2, placeholders: { title: "TitleShape", subtitle: "SubtitleShape" }, imageOrientation: null, description: "渐变背景 + 装饰圆形 + 居中标题" },
          { key: "content_text_only", label: "内容 — 纯文字", type: "content", slideIndex: 3, placeholders: { title: "TitleShape", body: "BodyShape" }, imageOrientation: null, description: "左侧强调线 + 标题 + 正文/要点列表" },
          { key: "content_image_right", label: "内容 — 右侧竖图", type: "content", slideIndex: 4, placeholders: { title: "TitleShape", body: "BodyShape", image: "ImageShape" }, imageOrientation: "portrait", description: "左侧文字 + 右侧竖向图片" },
          { key: "content_image_bottom", label: "内容 — 底部横图", type: "content", slideIndex: 5, placeholders: { title: "TitleShape", body: "BodyShape", image: "ImageShape" }, imageOrientation: "landscape", description: "上方标题/正文 + 下方横向图片" },
          { key: "interaction_card", label: "互动 — 卡片式", type: "interaction", slideIndex: 6, placeholders: { title: "TitleShape", body: "BodyShape" }, imageOrientation: null, description: "强调色标题栏 + 卡片式内容区" },
          { key: "showcase_centered", label: "展示 — 居中图文", type: "showcase", slideIndex: 7, placeholders: { title: "TitleShape", body: "BodyShape", image: "ImageShape" }, imageOrientation: "landscape", description: "居中标题 + 正文 + 横向图片展示区" },
          { key: "ending_summary", label: "结束 — 总结", type: "ending", slideIndex: 8, placeholders: { title: "TitleShape", body: "BodyShape" }, imageOrientation: null, description: "装饰背景 + 居中大标题 + 总结文字" },
        ];
        const items: Array<{ name: string; value: string }> = [];
        for (const theme of themes) {
          for (const layout of layouts) {
            items.push({
              name: `${theme.dir}/${layout.key}`,
              value: JSON.stringify({
                label: layout.label,
                themeKey: theme.themeKey,
                templateDir: theme.dir,
                type: layout.type,
                slideIndex: layout.slideIndex,
                placeholders: layout.placeholders,
                imageOrientation: layout.imageOrientation,
                description: layout.description,
              }),
            });
          }
        }
        return items;
      })(),
    },
  ];

  for (const group of presets) {
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      await prisma.preset.upsert({
        where: {
          category_name: { category: group.category, name: item.name },
        },
        update: { value: item.value, sortOrder: i + 1, isActive: true },
        create: {
          category: group.category,
          name: item.name,
          value: item.value,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      console.log(`  [${group.category}] ${item.name}`);
    }
  }
}

// ─── Main ───

async function main() {
  console.log("Seeding baselines...");
  await seedBaselines();
  console.log("Seeding prompt templates...");
  await seedPromptTemplates();
  console.log("Seeding presets...");
  await seedPresets();
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
