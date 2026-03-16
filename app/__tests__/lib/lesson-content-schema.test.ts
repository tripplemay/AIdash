import { lessonContentSchema, validateContentData } from "@/lib/lesson-content-schema";

describe("lessonContentSchema", () => {
  const validContent = {
    hero: {
      tags: ["教师授课包", "45 分钟"],
      title: "测试课程",
      subtitle: "测试副标题",
      goal: "测试目标",
      outcome: "测试成果",
    },
    sections: [
      { id: "core", title: "本课核心信息", blocks: [] },
      { id: "ai_value", title: "本课 AI 环节价值说明", blocks: [] },
      { id: "prep", title: "课前备课提示单", blocks: [] },
      { id: "flow", title: "课堂执行清单", blocks: [] },
      { id: "issues", title: "学生卡点应对表", blocks: [] },
      { id: "materials", title: "本课附件与模板", blocks: [] },
      { id: "review", title: "课后复盘记录区", blocks: [] },
    ],
  };

  it("accepts valid content", () => {
    const result = lessonContentSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it("rejects missing hero", () => {
    const result = lessonContentSchema.safeParse({ sections: validContent.sections });
    expect(result.success).toBe(false);
  });

  it("rejects missing sections", () => {
    const result = lessonContentSchema.safeParse({ hero: validContent.hero });
    expect(result.success).toBe(false);
  });

  it("rejects empty sections", () => {
    const result = lessonContentSchema.safeParse({ hero: validContent.hero, sections: [] });
    expect(result.success).toBe(false);
  });

  it("rejects hero missing required fields", () => {
    const result = lessonContentSchema.safeParse({
      hero: { tags: [], title: "T" },
      sections: validContent.sections,
    });
    expect(result.success).toBe(false);
  });

  it("accepts text block", () => {
    const content = {
      ...validContent,
      sections: [
        { id: "core", title: "核心", blocks: [{ type: "text", content: "hello" }] },
        ...validContent.sections.slice(1),
      ],
    };
    const result = lessonContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });

  it("accepts accordion block with time", () => {
    const content = {
      ...validContent,
      sections: [
        ...validContent.sections.slice(0, 3),
        {
          id: "flow", title: "课堂执行清单", blocks: [
            { type: "accordion", title: "环节 1", time: "0-5 分钟", blocks: [] },
          ],
        },
        ...validContent.sections.slice(4),
      ],
    };
    const result = lessonContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });

  it("accepts template block", () => {
    const content = {
      ...validContent,
      sections: [
        ...validContent.sections.slice(0, 5),
        {
          id: "materials", title: "附件", blocks: [
            { type: "template", label: "模板", content: "请输入..." },
          ],
        },
        validContent.sections[6],
      ],
    };
    const result = lessonContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });
});

describe("validateContentData", () => {
  it("returns errors for invalid data", () => {
    const result = validateContentData({});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toBeDefined();
  });

  it("returns success for valid data", () => {
    const result = validateContentData({
      hero: { tags: [], title: "T", subtitle: "S", goal: "G", outcome: "O" },
      sections: [
        { id: "core", title: "T", blocks: [] },
        { id: "ai_value", title: "T", blocks: [] },
        { id: "prep", title: "T", blocks: [] },
        { id: "flow", title: "T", blocks: [] },
        { id: "issues", title: "T", blocks: [] },
        { id: "materials", title: "T", blocks: [] },
        { id: "review", title: "T", blocks: [] },
      ],
    });
    expect(result.success).toBe(true);
  });
});
