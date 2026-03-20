import { POST } from "@/app/api/course-rnd/projects/[id]/validate/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: { findUnique: jest.fn() },
    courseRndLessonDraft: { findMany: jest.fn() },
    courseRndAiCallLog: { create: jest.fn() },
  },
}));
jest.mock("@/lib/ai/provider", () => ({
  getProviderAndModel: jest.fn(),
}));
jest.mock("@/lib/ai/pricing-service", () => ({
  calculateCallCostFromDb: jest.fn(() => 0.03),
}));
jest.mock("@/lib/ai/prompts", () => ({
  getBaselinePrompt: jest.fn(() => "baseline "),
  validateLessonPrompt: jest.fn(() => "validate prompt"),
}));
jest.mock("@/lib/ai/template-engine", () => ({
  resolveTemplate: jest.fn(() => null),
}));
jest.mock("@/lib/ai/lesson-context", () => ({
  loadFrameworkContext: jest.fn(() => ({ summary: "course summary", framework: null })),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";

const mockAuth = auth as jest.Mock;
const mockFindProject = prisma.courseRndProject.findUnique as jest.Mock;
const mockFindDrafts = prisma.courseRndLessonDraft.findMany as jest.Mock;
const mockGetProviderAndModel = getProviderAndModel as jest.Mock;

const rdSession = { user: { id: "u1", role: "rd_manager" }, expires: "" };

function makeParams(id = "proj-1") {
  return { params: Promise.resolve({ id }) };
}

function makeRequest() {
  return new Request("http://localhost/api/course-rnd/projects/proj-1/validate", {
    method: "POST",
  });
}

const projectData = {
  title: "Test Project",
  ageRange: "A1",
  level: "L1",
  courseDirection: "方向",
  coreDeliverable: "产出物",
  orgForm: "S1",
  deliverableType: "P1",
  coreNeeds: null,
  constraints: null,
  currentPlanVersionId: "plan-v1",
  currentDirectionVersionId: "dir-v1",
};

const draftsWithContent = [
  {
    lessonNo: 1,
    title: "Lesson 1",
    draftJson: JSON.stringify({
      title: "Lesson 1",
      subtitle: "Sub",
      goal: "Goal",
      outcome: "Outcome",
      flow: [{ title: "Intro", time: "5min" }],
      issues: [{ q: "q1" }],
    }),
  },
  {
    lessonNo: 2,
    title: "Lesson 2",
    draftJson: JSON.stringify({ title: "Lesson 2", goal: "Goal 2" }),
  },
];

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/validate", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue({ user: { role: "teacher" }, expires: "" });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindProject.mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("项目不存在");
  });

  it("returns 400 when no plan version", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindProject.mockResolvedValue({ ...projectData, currentPlanVersionId: null });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("无方案版本");
  });

  it("returns 400 when no drafts with content", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindProject.mockResolvedValue(projectData);
    mockFindDrafts.mockResolvedValue([
      { lessonNo: 1, title: "Lesson 1", draftJson: null },
      { lessonNo: 2, title: "Lesson 2", draftJson: null },
    ]);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("尚无已生成的课次方案");
  });

  it("returns 503 when AI not configured", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindProject.mockResolvedValue(projectData);
    mockFindDrafts.mockResolvedValue(draftsWithContent);
    mockGetProviderAndModel.mockRejectedValue(new Error("AI 审核服务未配置"));
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain("审核服务未配置");
  });

  it("returns SSE with items and done event for line-format output", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindProject.mockResolvedValue(projectData);
    mockFindDrafts.mockResolvedValue(draftsWithContent);

    const lineOutput = [
      "1|pass|课次目标清晰明确",
      "2|pass|AI 环节有实际价值",
      "3|warning|时间分配略紧",
      "4|pass|卡点充分",
      "5|pass|模板可操作",
      "6|pass|适配年龄段",
      "7|pass|递进关系合理",
      "8|pass|作品感强",
      "9|pass|课次独立",
      "10|pass|未跑偏",
      "OVERALL|pass|整体通过",
    ].join("\n");

    const mockProvider = {
      chat: jest.fn().mockResolvedValue({
        content: lineOutput,
        inputTokens: 500,
        outputTokens: 300,
        model: "test-model",
      }),
      // chatStream intentionally undefined
    };
    mockGetProviderAndModel.mockResolvedValue({ provider: mockProvider, model: "test-model" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const text = await res.text();
    expect(text).toContain("event: item");
    expect(text).toContain("event: overall");
    expect(text).toContain("event: done");
    expect(text).toContain('"criterion":"课次目标清晰度"');
    expect(text).toContain('"overallPass":true');
  });

  it("falls back to JSON parsing for old format output", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindProject.mockResolvedValue(projectData);
    mockFindDrafts.mockResolvedValue(draftsWithContent);

    const jsonOutput = JSON.stringify({
      overallPass: true,
      items: [
        { criterion: "课次目标清晰度", status: "pass", detail: "ok" },
        { criterion: "AI 环节实际价值", status: "warning", detail: "可改进" },
      ],
      summary: "整体表现不错",
    });

    const mockProvider = {
      chat: jest.fn().mockResolvedValue({
        content: jsonOutput,
        inputTokens: 400,
        outputTokens: 200,
        model: "test-model",
      }),
    };
    mockGetProviderAndModel.mockResolvedValue({ provider: mockProvider, model: "test-model" });

    const res = await POST(makeRequest(), makeParams());
    const text = await res.text();
    expect(text).toContain("event: item");
    expect(text).toContain("event: overall");
    expect(text).toContain("event: done");
    expect(text).toContain('"overallPass":true');
    expect(text).toContain('"summary":"整体表现不错"');
  });
});
