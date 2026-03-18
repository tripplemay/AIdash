import { POST } from "@/app/api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate-image/route";

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
jest.mock("@/lib/ai/image-store", () => ({ saveAiImage: jest.fn() }));
jest.mock("@/lib/ai/build-content-data", () => ({
  buildContentData: jest.fn(() => ({ blocks: [] })),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { saveAiImage } from "@/lib/ai/image-store";

const mockAuth = auth as jest.Mock;
const mockProjectFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockDraftFindFirst = prisma.courseRndLessonDraft.findFirst as jest.Mock;
const mockDraftUpdate = prisma.courseRndLessonDraft.update as jest.Mock;
const mockLogCreate = prisma.courseRndAiCallLog.create as jest.Mock;
const mockGetProviderAndModel = getProviderAndModel as jest.Mock;
const mockCalculateCost = calculateCallCostFromDb as jest.Mock;
const mockSaveAiImage = saveAiImage as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string, lessonNo: string) => ({
  params: Promise.resolve({ id, lessonNo }),
});
const makeRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/course-rnd/projects/p1/lessons/1/regenerate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const sampleProject = {
  id: "p1",
  title: "Test Course",
  currentPlanVersionId: "plan-v1",
  imageStylePrompt: "cartoon style",
};

const sampleDraft = {
  id: "draft-1",
  draftJson: JSON.stringify({
    title: "Lesson 1",
    hero_image_prompt: "A colorful robot",
    hero_image_url: "/old-hero.png",
    illustration_prompt: "Kids coding",
    illustration_url: "/old-illust.png",
    template_image_prompt: "Template design",
    template_image_url: "/old-template.png",
  }),
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate-image", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("p1", "1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when imageType is missing", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await POST(makeRequest({}), makeParams("p1", "1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("无效的图片类型");
  });

  it("returns 400 when imageType is invalid", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await POST(makeRequest({ imageType: "invalid" }), makeParams("p1", "1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("nonexistent", "1"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("项目不存在");
  });

  it("returns 404 when draft not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("p1", "99"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("课次草稿不存在");
  });

  it("returns 400 when draft has no prompt for requested image type", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue({
      id: "draft-1",
      draftJson: JSON.stringify({ title: "Lesson 1" }), // no image prompts
    });

    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("p1", "1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("没有对应的图片描述");
  });

  it("returns 503 when AI provider is not configured", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(sampleDraft);
    mockGetProviderAndModel.mockRejectedValue(new Error("图片模型未配置"));

    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("p1", "1"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("图片模型未配置");
  });

  it("returns 503 when provider does not support image generation", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(sampleDraft);
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: jest.fn() }, // no generateImage
      model: "gpt-4",
    });

    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("p1", "1"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("该服务商不支持图片生成");
  });

  it("regenerates hero image and updates draft on success", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(sampleDraft);

    const mockGenerateImage = jest.fn().mockResolvedValue({ url: "https://ai.example.com/new-hero.png" });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { generateImage: mockGenerateImage },
      model: "dall-e-3",
    });
    mockSaveAiImage.mockResolvedValue("/uploads/lessons/p1/new-hero.png");
    mockDraftUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.04);
    mockLogCreate.mockResolvedValue({});

    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("p1", "1"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.imageType).toBe("hero");
    expect(json.data.imageUrl).toBe("/uploads/lessons/p1/new-hero.png");

    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    expect(mockDraftUpdate).toHaveBeenCalledTimes(1);
    expect(mockLogCreate).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when image generation fails", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockDraftFindFirst.mockResolvedValue(sampleDraft);

    const mockGenerateImage = jest.fn().mockRejectedValue(new Error("API timeout"));
    mockGetProviderAndModel.mockResolvedValue({
      provider: { generateImage: mockGenerateImage },
      model: "dall-e-3",
    });

    const res = await POST(makeRequest({ imageType: "hero" }), makeParams("p1", "1"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("图片生成失败");
  });
});
