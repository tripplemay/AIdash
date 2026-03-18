import { POST } from "@/app/api/course-rnd/projects/[id]/generate-cover/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courseRndAiCallLog: {
      create: jest.fn(),
    },
    preset: {
      findFirst: jest.fn(),
    },
    promptTemplate: {
      findUnique: jest.fn(),
    },
    baselineDoc: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock("@/lib/ai/provider", () => ({ getProviderAndModel: jest.fn() }));
jest.mock("@/lib/ai/pricing-service", () => ({ calculateCallCostFromDb: jest.fn() }));
jest.mock("@/lib/ai/image-store", () => ({ saveAiImage: jest.fn() }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { saveAiImage } from "@/lib/ai/image-store";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockProjectUpdate = prisma.courseRndProject.update as jest.Mock;
const mockLogCreate = prisma.courseRndAiCallLog.create as jest.Mock;
const mockGetProviderAndModel = getProviderAndModel as jest.Mock;
const mockCalculateCost = calculateCallCostFromDb as jest.Mock;
const mockSaveAiImage = saveAiImage as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const makeRequest = (body: Record<string, unknown> = {}) =>
  new Request("http://localhost/api/course-rnd/projects/p1/generate-cover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const sampleProject = {
  id: "p1",
  title: "Test Course",
  ageRange: "A1",
  level: "L1",
  courseDirection: "AI",
  imageStylePrompt: "cute cartoon style",
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/generate-cover", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeRequest(), makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when not logged in", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams("nonexistent"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("项目不存在");
  });

  it("returns 503 when AI provider is not configured", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);
    mockGetProviderAndModel.mockRejectedValue(new Error("封面图模型未配置"));

    const res = await POST(makeRequest(), makeParams("p1"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("封面图模型未配置");
  });

  it("returns 503 when provider does not support image generation", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: jest.fn() }, // no generateImage
      model: "gpt-4",
    });

    const res = await POST(makeRequest(), makeParams("p1"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("该服务商不支持图片生成");
  });

  it("generates cover and returns URL on success", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);

    const mockGenerateImage = jest.fn().mockResolvedValue({ url: "https://ai.example.com/img.png" });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { generateImage: mockGenerateImage },
      model: "dall-e-3",
    });
    mockSaveAiImage.mockResolvedValue("/uploads/covers/p1/saved.png");
    mockProjectUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.04);
    mockLogCreate.mockResolvedValue({});

    const res = await POST(makeRequest(), makeParams("p1"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.coverUrl).toBe("/uploads/covers/p1/saved.png");

    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    expect(mockSaveAiImage).toHaveBeenCalledWith("https://ai.example.com/img.png", "covers/p1");
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { coverUrl: "/uploads/covers/p1/saved.png" },
    });
    expect(mockLogCreate).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when image generation fails", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);

    const mockGenerateImage = jest.fn().mockRejectedValue(new Error("Rate limit exceeded"));
    mockGetProviderAndModel.mockResolvedValue({
      provider: { generateImage: mockGenerateImage },
      model: "dall-e-3",
    });

    const res = await POST(makeRequest(), makeParams("p1"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("封面生成失败");
    expect(json.error).toContain("Rate limit exceeded");
  });

  it("uses custom prompt when provided", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);

    const mockGenerateImage = jest.fn().mockResolvedValue({ url: "https://ai.example.com/img.png" });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { generateImage: mockGenerateImage },
      model: "dall-e-3",
    });
    mockSaveAiImage.mockResolvedValue("/uploads/covers/p1/custom.png");
    mockProjectUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.04);
    mockLogCreate.mockResolvedValue({});

    const res = await POST(
      makeRequest({ customPrompt: "A cat in space" }),
      makeParams("p1"),
    );
    expect(res.status).toBe(200);

    // Custom prompt is prefixed with age hint + style
    const calledPrompt = mockGenerateImage.mock.calls[0][0].prompt;
    expect(calledPrompt).toContain("A cat in space");
    expect(calledPrompt).toContain("Designed for A1 age group");
  });
});
