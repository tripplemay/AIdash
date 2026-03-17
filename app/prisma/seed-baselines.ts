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
- 只输出 JSON，不要输出其他内容`,
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
- 只输出 JSON`,
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
- 内容要具体实用，教师拿到就能直接上课`,
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
- 字段名必须和原方案一致`,
  },
  {
    actionKey: "rewrite_field",
    actionLabel: "改写指定字段",
    content: `你是课程设计助手。用户要求改写课程方案中的某个特定部分。

请根据用户的意见改写指定内容，保持其他部分不变。

只输出改写后的文本内容（不是 JSON）。`,
  },
  {
    actionKey: "rewrite_teaching_talk",
    actionLabel: "生成教学话术",
    content: `你是课程设计助手。请根据课次方案重新生成授课表达示例。

授课表达示例是教师在课堂上可以直接使用的话术参考，要求：
- 语气自然、贴近教师真实表达
- 包含关键节点的过渡话术
- 简洁实用，不要过长

只输出授课表达示例文本。`,
  },
];

async function seedPromptTemplates() {
  for (const t of PROMPT_TEMPLATES) {
    const template = await prisma.promptTemplate.upsert({
      where: { actionKey: t.actionKey },
      update: { actionLabel: t.actionLabel, content: t.content },
      create: {
        actionKey: t.actionKey,
        actionLabel: t.actionLabel,
        content: t.content,
      },
    });
    await prisma.promptTemplateVersion.upsert({
      where: {
        templateId_versionNo: { templateId: template.id, versionNo: 1 },
      },
      update: { content: t.content },
      create: {
        templateId: template.id,
        versionNo: 1,
        content: t.content,
        editedById: null,
        editSummary: "系统初始导入",
      },
    });
    console.log(`  [prompt] ${t.actionKey} — ${t.actionLabel}`);
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
