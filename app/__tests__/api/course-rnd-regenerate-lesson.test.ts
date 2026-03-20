import { POST } from "@/app/api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: { findUnique: jest.fn() },
    courseRndLessonDraft: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    courseRndAiCallLog: { create: jest.fn() },
    preset: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/ai/provider", () => ({
  getProviderAndModel: jest.fn(),
}));
jest.mock("@/lib/ai/pricing-service", () => ({
  calculateCallCostFromDb: jest.fn(() => 0.05),
}));
jest.mock("@/lib/ai/build-content-data", () => ({
  buildContentData: jest.fn(() => ({ hero: null, sections: [] })),
}));
jest.mock("@/lib/ai/prompts", () => ({
  getBaselinePrompt: jest.fn(() => "baseline-prompt "),
}));
jest.mock("@/lib/ai/template-engine", () => ({
  resolveTemplate: jest.fn(() => null),
}));
jest.mock("@/lib/ai/image-store", () => ({
  saveAiImage: jest.fn(() => "/images/saved.webp"),
}));
jest.mock("@/lib/ai/lesson-context", () => ({
  loadFrameworkContext: jest.fn(() => ({ summary: "course summary", framework: null })),
  buildLessonListWithOverview: jest.fn(() => "lesson list"),
  buildGeneratedLessonsSummary: jest.fn(() => "generated lessons"),
  buildRegenerateUserMessage: jest.fn(() => "user message"),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";

const mockAuth = auth as jest.Mock;
const mockFindProject = prisma.courseRndProject.findUnique as jest.Mock;
const mockFindDraft = prisma.courseRndLessonDraft.findFirst as jest.Mock;
const mockFindDrafts = prisma.courseRndLessonDraft.findMany as jest.Mock;
const mockGetProviderAndModel = getProviderAndModel as jest.Mock;

const rdSession = { user: { id: "u1", role: "rd_manager" }, expires: "" };

function makeParams(id = "proj-1", lessonNo = "1") {
  return { params: Promise.resolve({ id, lessonNo }) };
}

function makeRequest() {
  return new Request("http://localhost/api/course-rnd/projects/proj-1/lessons/1/regenerate", {
    method: "POST",
  });
}

const validAiOutput = JSON.stringify({
  title: "test",
  subtitle: "sub",
  goal: "g",
  outcome: "o",
  tags: ["t"],
  positioning: "p",
  conditions: ["c"],
  objectives: ["obj"],
  minimum_output: ["min"],
  ai_value_quote: "av",
  ai_rounds: [{ name: "r1", value: "p1" }],
  without_ai: ["wa"],
  student_must_do: ["sm"],
  teacher_prep: ["tp"],
  equipment: ["eq"],
  reminder: "rm",
  flow: [
    {
      title: "f1",
      time: "5min",
      goal: "fg",
      actions: "a",
      teacher_says: ["ts"],
      ai_template: null,
      checkpoint: "cp",
    },
  ],
  issues: [{ question: "q", answer: "a" }],
  outcome_template: "ot",
  demo_case: { name: "dc", details: ["d1"] },
  review_questions: ["rq"],
  parent_message: "pm",
});

function setupProjectAndDraft() {
  mockFindProject.mockResolvedValue({
    title: "Test Project",
    ageRange: "A1",
    level: "L1",
    coreDeliverable: "产出物",
    courseDirection: "方向",
    currentPlanVersionId: "plan-v1",
    currentDirectionVersionId: "dir-v1",
    orgForm: "S1",
    deliverableType: "P1",
    deliverableName: null,
    imageStylePrompt: null,
    coreNeeds: null,
    constraints: null,
  });
  mockFindDraft.mockResolvedValue({ id: "draft-1", title: "Lesson 1", lessonNo: 1 });
  mockFindDrafts.mockResolvedValue([
    { lessonNo: 1, title: "Lesson 1", draftJson: null },
  ]);
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate", () => {
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

  it("returns 404 when draft not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindProject.mockResolvedValue({
      title: "Test",
      currentPlanVersionId: "plan-v1",
      currentDirectionVersionId: "dir-v1",
    });
    mockFindDraft.mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("草稿不存在");
  });

  it("returns 503 when AI not configured", async () => {
    mockAuth.mockResolvedValue(rdSession);
    setupProjectAndDraft();
    mockGetProviderAndModel.mockRejectedValue(new Error("AI 服务未配置"));
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain("AI 服务未配置");
  });

  it("returns SSE stream with done event on success (non-streaming fallback)", async () => {
    mockAuth.mockResolvedValue(rdSession);
    setupProjectAndDraft();

    const mockProvider = {
      chat: jest.fn().mockResolvedValue({
        content: validAiOutput,
        inputTokens: 100,
        outputTokens: 200,
        model: "test-model",
      }),
      // chatStream intentionally undefined to trigger non-streaming fallback
    };
    mockGetProviderAndModel.mockResolvedValue({ provider: mockProvider, model: "test-model" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const text = await res.text();
    expect(text).toContain("event: done");
    expect(text).toContain("event: progress");
    expect(text).toContain('"step":8');
  });

  it("sends error event when AI output is invalid JSON (both attempts fail)", async () => {
    mockAuth.mockResolvedValue(rdSession);
    setupProjectAndDraft();

    const mockProvider = {
      chat: jest.fn().mockResolvedValue({
        content: "this is not valid json at all",
        inputTokens: 50,
        outputTokens: 50,
        model: "test-model",
      }),
    };
    mockGetProviderAndModel.mockResolvedValue({ provider: mockProvider, model: "test-model" });

    const res = await POST(makeRequest(), makeParams());
    const text = await res.text();
    expect(text).toContain("event: error");
    expect(text).toContain("解析失败");
    // chat should have been called twice (retry)
    expect(mockProvider.chat).toHaveBeenCalledTimes(2);
  });
});
