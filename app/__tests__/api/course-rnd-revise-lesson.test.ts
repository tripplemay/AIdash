import { POST } from "@/app/api/course-rnd/projects/[id]/lessons/[lessonNo]/revise/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
    },
    courseRndLessonDraft: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    courseRndAiCallLog: {
      create: jest.fn(),
    },
    preset: {
      findFirst: jest.fn(),
    },
  },
}));
jest.mock("@/lib/ai/provider", () => ({ getProviderAndModel: jest.fn() }));
jest.mock("@/lib/ai/pricing-service", () => ({ calculateCallCostFromDb: jest.fn() }));
jest.mock("@/lib/ai/prompts", () => ({
  getBaselinePrompt: jest.fn(() => "baseline-prompt"),
}));
jest.mock("@/lib/ai/template-engine", () => ({ getSystemPrompt: jest.fn() }));
jest.mock("@/lib/ai/image-store", () => ({ saveAiImage: jest.fn() }));
jest.mock("@/lib/ai/build-content-data", () => ({
  buildContentData: jest.fn(() => ({ blocks: [] })),
}));
jest.mock("@/lib/ai/lesson-context", () => ({
  loadFrameworkContext: jest.fn(() => Promise.resolve({ summary: "course summary", framework: [] })),
  buildLessonListWithOverview: jest.fn(() => ""),
  buildGeneratedLessonsSummary: jest.fn(() => ""),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { getSystemPrompt } from "@/lib/ai/template-engine";
import { saveAiImage } from "@/lib/ai/image-store";

const mockAuth = auth as jest.Mock;
const mockProjectFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockDraftFindFirst = prisma.courseRndLessonDraft.findFirst as jest.Mock;
const mockDraftUpdate = prisma.courseRndLessonDraft.update as jest.Mock;
const mockLogCreate = prisma.courseRndAiCallLog.create as jest.Mock;
const mockGetProviderAndModel = getProviderAndModel as jest.Mock;
const mockCalculateCost = calculateCallCostFromDb as jest.Mock;
const mockGetSystemPrompt = getSystemPrompt as jest.Mock;
const mockSaveAiImage = saveAiImage as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string, lessonNo: string) => ({
  params: Promise.resolve({ id, lessonNo }),
});
const makeRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/course-rnd/projects/p1/lessons/1/revise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const sampleProject = {
  title: "Test Course",
  ageRange: "A1",
  level: "L1",
  courseDirection: "AI",
  coreDeliverable: "Robot",
  currentDirectionVersionId: "dv-1",
  currentPlanVersionId: "plan-v1",
  orgForm: "S1",
  deliverableType: "P1",
  deliverableName: null,
  imageStylePrompt: null,
  coreNeeds: null,
  constraints: null,
};

const sampleDraft = {
  id: "draft-1",
  title: "Lesson 1",
  draftJson: JSON.stringify({
    title: "Lesson 1",
    positioning: "Basic intro",
    objectives: ["Learn basics"],
    flow: [{ title: "Intro", time: "0-10 min" }],
  }),
  planVersionId: "plan-v1",
  lessonNo: 1,
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/lessons/[lessonNo]/revise", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(
      makeRequest({ feedback: "change it", planVersionId: "plan-v1" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when feedback is missing", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await POST(
      makeRequest({ planVersionId: "plan-v1" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("请输入修改意见");
  });

  it("returns 404 when draft not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ feedback: "change it", planVersionId: "plan-v1" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("课次草稿不存在");
  });

  it("returns 400 when draft has no draftJson", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue({
      ...sampleDraft,
      draftJson: null,
    });

    const res = await POST(
      makeRequest({ feedback: "change it", planVersionId: "plan-v1" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("请先生成课程方案");
  });

  it("returns 503 when AI provider is not configured (text revision)", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(sampleDraft);
    mockGetProviderAndModel.mockRejectedValue(new Error("AI 服务未配置"));

    const res = await POST(
      makeRequest({ feedback: "change the title", planVersionId: "plan-v1" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("AI 服务未配置");
  });

  it("returns 503 when image provider is not configured (image revision)", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue({
      ...sampleDraft,
      draftJson: JSON.stringify({
        title: "Lesson 1",
        hero_image_prompt: "A robot",
        hero_image_url: "/old.png",
      }),
    });
    mockGetProviderAndModel.mockRejectedValue(new Error("图片模型未配置"));

    const res = await POST(
      makeRequest({ feedback: "make it brighter", planVersionId: "plan-v1", targetSection: "hero_image" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("图片模型未配置");
  });

  it("calls AI and merges changes on text revision success", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(sampleDraft);
    mockGetSystemPrompt.mockResolvedValue(null);

    const mockChat = jest.fn().mockResolvedValue({
      content: JSON.stringify({ title: "Updated Lesson 1" }),
      model: "gpt-4",
      inputTokens: 200,
      outputTokens: 50,
    });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-4",
    });
    mockDraftUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.03);
    mockLogCreate.mockResolvedValue({});

    const res = await POST(
      makeRequest({ feedback: "change the title", planVersionId: "plan-v1" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.lessonNo).toBe(1);
    expect(json.data.changes).toContain("title");

    expect(mockChat).toHaveBeenCalledTimes(1);
    expect(mockDraftUpdate).toHaveBeenCalledTimes(1);
    expect(mockLogCreate).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when AI output cannot be parsed", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(sampleDraft);
    mockGetSystemPrompt.mockResolvedValue(null);

    const mockChat = jest.fn().mockResolvedValue({
      content: "I cannot process this request",
      model: "gpt-4",
      inputTokens: 200,
      outputTokens: 50,
    });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-4",
    });

    const res = await POST(
      makeRequest({ feedback: "change it", planVersionId: "plan-v1" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("AI 输出解析失败");
  });

  it("handles image revision via targetSection", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue({
      ...sampleDraft,
      draftJson: JSON.stringify({
        title: "Lesson 1",
        hero_image_prompt: "A colorful robot",
        hero_image_url: "/old-hero.png",
      }),
    });

    const mockGenerateImage = jest.fn().mockResolvedValue({ url: "https://ai.example.com/new.png" });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { generateImage: mockGenerateImage },
      model: "dall-e-3",
    });
    mockSaveAiImage.mockResolvedValue("/uploads/lessons/p1/new.png");
    mockDraftUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.04);
    mockLogCreate.mockResolvedValue({});

    const res = await POST(
      makeRequest({ feedback: "make it brighter", planVersionId: "plan-v1", targetSection: "hero_image" }),
      makeParams("p1", "1"),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.contentData).toBeDefined();
    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    expect(mockSaveAiImage).toHaveBeenCalledTimes(1);
  });
});
