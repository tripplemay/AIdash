import { POST } from "@/app/api/slideshow/generate/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: jest.fn() },
    preset: { findUnique: jest.fn() },
    slideshowDraft: { upsert: jest.fn() },
    courseRndAiCallLog: { create: jest.fn() },
  },
}));
jest.mock("@/lib/ai/provider", () => ({
  getProviderAndModel: jest.fn(),
}));
jest.mock("@/lib/ai/template-engine", () => ({
  resolveTemplate: jest.fn(),
}));
jest.mock("@/lib/ai/pricing-service", () => ({
  calculateCallCostFromDb: jest.fn(() => 0.05),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { resolveTemplate } from "@/lib/ai/template-engine";

const mockAuth = auth as jest.Mock;
const mockLessonFind = prisma.lesson.findUnique as jest.Mock;
const mockPresetFind = prisma.preset.findUnique as jest.Mock;
const mockDraftUpsert = prisma.slideshowDraft.upsert as jest.Mock;
const mockLogCreate = prisma.courseRndAiCallLog.create as jest.Mock;
const mockGetProvider = getProviderAndModel as jest.Mock;
const mockResolveTemplate = resolveTemplate as jest.Mock;

const session = { user: { id: "u-1", role: "rd_manager" }, expires: "" };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/slideshow/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as unknown as import("next/server").NextRequest;

beforeEach(() => jest.clearAllMocks());

describe("POST /api/slideshow/generate", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing params", async () => {
    mockAuth.mockResolvedValue(session);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("缺少必填参数");
  });

  it("returns 500 when lesson not found", async () => {
    mockAuth.mockResolvedValue(session);
    mockLessonFind.mockResolvedValue(null);
    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("课次不存在");
  });

  it("returns 500 when package not published", async () => {
    mockAuth.mockResolvedValue(session);
    mockLessonFind.mockResolvedValue({
      id: "l-1",
      contentData: '{"hero":{}}',
      package: { title: "Test", status: "draft", ageRange: "A2", level: "L2" },
    });
    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("未发布");
  });

  it("generates slideshow successfully", async () => {
    mockAuth.mockResolvedValue(session);
    mockLessonFind.mockResolvedValue({
      id: "l-1",
      lessonNo: 1,
      title: "色彩的秘密",
      contentData: '{"hero":{"title":"色彩的秘密"},"sections":[]}',
      package: { title: "创意课程", status: "published", ageRange: "A2", level: "L2" },
    });
    mockPresetFind.mockResolvedValue({ name: "科技蓝", value: '{"description":"蓝紫渐变"}' });
    mockResolveTemplate.mockResolvedValue({
      prompt: "resolved system prompt",
      templateId: "t-1",
      templateVersionNo: 1,
    });
    mockGetProvider.mockResolvedValue({
      provider: {
        chat: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            slides: [
              { type: "cover", title: "色彩的秘密" },
              { type: "content", title: "什么是色彩" },
            ],
          }),
          inputTokens: 1000,
          outputTokens: 500,
          model: "gpt-4o",
        }),
      },
      model: "gpt-4o",
    });
    mockDraftUpsert.mockResolvedValue({ id: "d-1" });
    mockLogCreate.mockResolvedValue({});

    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.draftId).toBe("d-1");
    expect(json.data.slideCount).toBe(2);
    expect(mockDraftUpsert).toHaveBeenCalled();
    expect(mockLogCreate).toHaveBeenCalled();
  });

  it("returns 500 when prompt template not configured", async () => {
    mockAuth.mockResolvedValue(session);
    mockLessonFind.mockResolvedValue({
      id: "l-1",
      lessonNo: 1,
      title: "色彩的秘密",
      contentData: '{"hero":{}}',
      package: { title: "创意课程", status: "published", ageRange: "A2", level: "L2" },
    });
    mockPresetFind.mockResolvedValue({ name: "科技蓝", value: '{"description":"蓝紫渐变"}' });
    mockResolveTemplate.mockResolvedValue(null);

    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Prompt 模板未配置");
  });
});
