jest.mock("@/lib/prisma", () => ({
  prisma: {
    promptTemplate: { findUnique: jest.fn() },
    baselineDoc: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/ai/baseline-assembler", () => ({
  assembleBaselines: jest.fn(),
}));

import { resolveTemplate } from "@/lib/ai/template-engine";
import { prisma } from "@/lib/prisma";
import { assembleBaselines } from "@/lib/ai/baseline-assembler";

const mockFindUnique = prisma.promptTemplate.findUnique as jest.Mock;
const mockBaselineFindUnique = prisma.baselineDoc.findUnique as jest.Mock;
const mockAssembleBaselines = assembleBaselines as jest.Mock;

const emptyBaselines = {
  general: "",
  age: "",
  level: "",
  orgForm: "",
  deliverable: "",
  matrix: "",
};

const mockTemplate = (content: string) => ({
  id: "tpl_test",
  content,
  versions: [{ versionNo: 3 }],
});

function setupDefaults() {
  mockAssembleBaselines.mockResolvedValue(emptyBaselines);
  mockBaselineFindUnique.mockResolvedValue(null);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaults();
});

describe("resolveTemplate", () => {
  it("returns null when no template is found in DB", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await resolveTemplate("unknown_action", {});
    expect(result).toBeNull();
  });

  it("returns TemplateResult with prompt, templateId, and templateVersionNo", async () => {
    mockFindUnique.mockResolvedValue(mockTemplate("Hello {{项目标题}}"));

    const result = await resolveTemplate("generate_framework", { title: "测试" });

    expect(result).not.toBeNull();
    expect(result!.prompt).toBe("Hello 测试");
    expect(result!.templateId).toBe("tpl_test");
    expect(result!.templateVersionNo).toBe(3);
  });

  it("replaces known variables correctly", async () => {
    mockFindUnique.mockResolvedValue(mockTemplate("课程标题: {{项目标题}}, 方向: {{课程方向}}"));

    const result = await resolveTemplate("generate_framework", {
      title: "AI入门",
      courseDirection: "人工智能",
    });

    expect(result!.prompt).toBe("课程标题: AI入门, 方向: 人工智能");
  });

  it("leaves unknown variables as-is in the output", async () => {
    mockFindUnique.mockResolvedValue(mockTemplate("已知: {{项目标题}}, 未知: {{未知变量}}"));

    const result = await resolveTemplate("some_action", { title: "测试课程" });

    expect(result!.prompt).toContain("已知: 测试课程");
    expect(result!.prompt).toContain("{{未知变量}}");
  });

  it("replaces missing context values with '未指定'", async () => {
    mockFindUnique.mockResolvedValue(mockTemplate("标题: {{项目标题}}, 方向: {{课程方向}}"));

    const result = await resolveTemplate("some_action", {
      title: null,
      courseDirection: undefined,
    });

    expect(result!.prompt).toBe("标题: 未指定, 方向: 未指定");
  });

  it("handles multiple variables in one template", async () => {
    mockFindUnique.mockResolvedValue(
      mockTemplate("{{项目标题}} - {{目标年龄段}} - {{目标级别}} - {{预计课次数}}")
    );

    const result = await resolveTemplate("multi_var", {
      title: "编程课",
      ageRange: "6-8",
      level: "beginner",
      lessonCount: 12,
    });

    expect(result!.prompt).toBe("编程课 - 6-8 - beginner - 12");
  });

  it("handles variables with spaces around name inside braces", async () => {
    mockFindUnique.mockResolvedValue(
      mockTemplate("标题: {{ 项目标题 }}, 方向: {{  课程方向  }}")
    );

    const result = await resolveTemplate("spaced_vars", {
      title: "空格测试",
      courseDirection: "数学",
    });

    expect(result!.prompt).toBe("标题: 空格测试, 方向: 数学");
  });

  it("defaults to versionNo 1 when no versions exist", async () => {
    mockFindUnique.mockResolvedValue({ id: "tpl_new", content: "test", versions: [] });

    const result = await resolveTemplate("test", {});
    expect(result!.templateVersionNo).toBe(1);
  });
});
