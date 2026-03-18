/**
 * AI 生成的简单课程内容格式
 * AI 只负责填写内容字段，系统负责组装为 v2 contentData
 */
export interface AiLessonOutput {
  title: string;
  subtitle: string;
  goal: string;
  outcome: string;
  tags: string[];

  // core section
  positioning: string;
  conditions: string[];
  objectives: string[];
  minimum_output: string[];

  // ai_value section
  ai_value_quote: string;
  ai_rounds: Array<{ name: string; value: string }>;
  without_ai: string[];
  student_must_do: string[];

  // prep section
  teacher_prep: string[];
  equipment: string[];
  reminder: string;

  // flow section
  flow: Array<{
    title: string;
    time: string;
    goal: string;
    actions: string;
    teacher_says: string[];
    ai_template?: { label: string; content: string } | null;
    checkpoint?: string | null;
  }>;

  // issues section
  issues: Array<{ question: string; answer: string }>;

  // materials section
  outcome_template: string;
  demo_case: { name: string; details: string[] };

  // review section
  review_questions: string[];
  parent_message: string;

  // 图片描述（AI 生成文字描述，系统调用图片模型生成实际图片）
  hero_image_prompt?: string;      // Hero 区主图描述
  illustration_prompt?: string;    // 课内插图描述
  template_image_prompt?: string;  // 作品模板图描述

  // 图片 URL（系统生成后回填）
  hero_image_url?: string;
  illustration_url?: string;
  template_image_url?: string;
}

/**
 * 将 AI 简单输出转换为 v2 contentData（hero + 7 sections）
 * 格式 100% 由代码控制，不依赖 AI
 */
export function buildContentData(input: AiLessonOutput) {
  return {
    hero: {
      tags: input.tags,
      title: input.title,
      subtitle: input.subtitle,
      goal: input.goal,
      outcome: input.outcome,
      ...(input.hero_image_url && { imageUrl: input.hero_image_url }),
    },
    sections: [
      // 1. core
      {
        id: "core",
        title: "本课核心信息",
        blocks: [
          {
            type: "grid",
            cols: 2,
            items: [
              {
                type: "box",
                pill: { text: "本课定位", color: "blue" },
                blocks: [{ type: "text", content: input.positioning }],
              },
              {
                type: "box",
                pill: { text: "适用条件", color: "violet" },
                blocks: [{ type: "list", ordered: false, items: input.conditions }],
              },
            ],
          },
          {
            type: "grid",
            cols: 2,
            items: [
              {
                type: "box",
                pill: { text: "核心目标", color: "yellow" },
                blocks: [{ type: "list", ordered: false, items: input.objectives }],
              },
              {
                type: "box",
                pill: { text: "最小成果", color: "green" },
                blocks: [{ type: "list", ordered: false, items: input.minimum_output }],
              },
            ],
          },
        ],
      },

      // 2. ai_value
      {
        id: "ai_value",
        title: "本课 AI 环节价值说明",
        blocks: [
          { type: "quote", content: input.ai_value_quote },
          ...(input.ai_rounds.length > 0
            ? [
                {
                  type: "grid",
                  cols: Math.max(2, Math.min(input.ai_rounds.length, 3)) as 2 | 3,
                  items: input.ai_rounds.map((r) => ({
                    type: "box" as const,
                    pill: { text: r.name, color: "blue" as const },
                    blocks: [{ type: "text" as const, content: r.value }],
                  })),
                },
              ]
            : []),
          {
            type: "grid",
            cols: 2,
            items: [
              {
                type: "box",
                variant: "danger",
                blocks: [
                  { type: "text", content: "**如果没有 AI，学生可能会遇到的困难**" },
                  { type: "list", ordered: false, items: input.without_ai },
                ],
              },
              {
                type: "box",
                variant: "success",
                blocks: [
                  { type: "text", content: "**学生在 AI 之后仍然必须完成什么**" },
                  { type: "list", ordered: false, items: input.student_must_do },
                ],
              },
            ],
          },
        ],
      },

      // 3. prep
      {
        id: "prep",
        title: "课前备课提示单",
        blocks: [
          {
            type: "grid",
            cols: 3,
            items: [
              {
                type: "box",
                pill: { text: "教师准备", color: "default" },
                blocks: [{ type: "list", ordered: false, items: input.teacher_prep }],
              },
              {
                type: "box",
                pill: { text: "教室与设备", color: "default" },
                blocks: [{ type: "list", ordered: false, items: input.equipment }],
              },
              {
                type: "box",
                variant: "note",
                pill: { text: "一句提醒", color: "yellow" },
                blocks: [{ type: "text", content: `**${input.reminder}**` }],
              },
            ],
          },
        ],
      },

      // 4. flow
      {
        id: "flow",
        title: "课堂执行清单",
        blocks: input.flow.map((step) => ({
          type: "accordion",
          title: step.title,
          time: step.time,
          blocks: [
            { type: "text", content: `**目标：** ${step.goal}` },
            { type: "text", content: `**你要做什么：** ${step.actions}` },
            ...(step.teacher_says.length > 0
              ? [
                  { type: "text", content: "**你可以直接说：**" },
                  { type: "list", ordered: false, items: step.teacher_says.map((s) => `「${s}」`) },
                ]
              : []),
            ...(step.ai_template
              ? [{ type: "template", label: step.ai_template.label, content: step.ai_template.content }]
              : []),
            ...(step.checkpoint
              ? [{ type: "text", content: `**这一段结束时要看到：** ${step.checkpoint}` }]
              : []),
          ],
        })),
      },

      // 5. issues
      {
        id: "issues",
        title: "学生卡点应对表",
        blocks: [
          {
            type: "grid",
            cols: 2,
            items: input.issues.map((issue) => ({
              type: "box" as const,
              variant: "danger" as const,
              blocks: [{ type: "qa_pair" as const, question: issue.question, answer: issue.answer }],
            })),
          },
        ],
      },

      // 6. materials
      {
        id: "materials",
        title: "本课附件与模板",
        blocks: [
          {
            type: "grid",
            cols: 2,
            items: [
              {
                type: "box",
                pill: { text: "成果模板", color: "blue" },
                blocks: [
                  { type: "template", label: "学生成果模板", content: input.outcome_template },
                ],
              },
              {
                type: "box",
                pill: { text: "教师示范案例", color: "violet" },
                blocks: [
                  { type: "text", content: `**案例名称：** ${input.demo_case.name}` },
                  { type: "list", ordered: false, items: input.demo_case.details },
                ],
              },
            ],
          },
        ],
      },

      // 7. review
      {
        id: "review",
        title: "课后复盘记录区",
        blocks: [
          {
            type: "grid",
            cols: 2,
            items: [
              {
                type: "box",
                blocks: [
                  { type: "text", content: "**下课后马上记录**" },
                  { type: "list", ordered: true, items: input.review_questions },
                ],
              },
              {
                type: "box",
                variant: "note",
                blocks: [
                  { type: "text", content: "**家长沟通简版话术**" },
                  { type: "text", content: input.parent_message },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
