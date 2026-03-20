import { POST } from "@/app/api/course-rnd/projects/[id]/generate-framework/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courseRndDirectionVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    courseRndAiCallLog: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/ai/provider", () => ({ getProviderAndModel: jest.fn() }));
jest.mock("@/lib/ai/pricing-service", () => ({ calculateCallCostFromDb: jest.fn() }));
jest.mock("@/lib/ai/prompts", () => ({
  generateFrameworkPrompt: jest.fn(() => "generate-prompt"),
  getBaselinePrompt: jest.fn(() => "baseline-prompt"),
}));
jest.mock("@/lib/ai/template-engine", () => ({ resolveTemplate: jest.fn() }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { resolveTemplate } from "@/lib/ai/template-engine";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockProjectUpdate = prisma.courseRndProject.update as jest.Mock;
const mockVersionFindFirst = prisma.courseRndDirectionVersion.findFirst as jest.Mock;
const mockVersionCreate = prisma.courseRndDirectionVersion.create as jest.Mock;
const mockLogCreate = prisma.courseRndAiCallLog.create as jest.Mock;
const mockGetProviderAndModel = getProviderAndModel as jest.Mock;
const mockCalculateCost = calculateCallCostFromDb as jest.Mock;
const mockResolveTemplate = resolveTemplate as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const dummyRequest = new Request("http://localhost/api/course-rnd/projects/p1/generate-framework", {
  method: "POST",
  body: JSON.stringify({}),
});

const sampleProject = {
  id: "p1",
  title: "Test Course",
  targetAudience: "Kids",
  courseDirection: "AI",
  ageRange: "A1",
  level: "L1",
  lessonCount: 8,
  coreDeliverable: "Robot",
  roughFramework: null,
  coreNeeds: null,
  constraints: null,
  orgForm: "S1",
  deliverableType: "P1",
  deliverableName: null,
  imageStyle: null,
  imageStylePrompt: null,
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/generate-framework", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when not logged in", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(dummyRequest, makeParams("nonexistent"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("项目不存在");
  });

  it("returns 503 when AI provider is not configured", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);
    mockGetProviderAndModel.mockRejectedValue(new Error("AI 服务未配置"));

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("AI 服务未配置");
  });

  it("calls provider.chat and creates direction version on success", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);
    mockResolveTemplate.mockResolvedValue(null);

    const mockChat = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        summary: "Course summary",
        framework: [{ lessonNo: 1, title: "L1", overview: "O1" }],
      }),
      model: "gpt-4",
      inputTokens: 100,
      outputTokens: 200,
    });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-4",
    });

    mockVersionFindFirst.mockResolvedValue({ versionNo: 2 });
    mockVersionCreate.mockResolvedValue({ id: "ver-3" });
    mockProjectUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.05);
    mockLogCreate.mockResolvedValue({});

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.directionVersionId).toBe("ver-3");
    expect(json.data.versionNo).toBe(3);
    expect(json.data.summary).toBe("Course summary");
    expect(json.data.framework).toEqual([{ lessonNo: 1, title: "L1", overview: "O1" }]);

    expect(mockChat).toHaveBeenCalledTimes(1);
    expect(mockVersionCreate).toHaveBeenCalledTimes(1);
    expect(mockLogCreate).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when AI output cannot be parsed", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);
    mockResolveTemplate.mockResolvedValue(null);

    const mockChat = jest.fn().mockResolvedValue({
      content: "This is not JSON at all",
      model: "gpt-4",
      inputTokens: 100,
      outputTokens: 200,
    });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-4",
    });

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeParams("p1"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("AI 输出解析失败");
  });

  it("uses DB prompt template when available", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(sampleProject);
    mockResolveTemplate.mockResolvedValue({ prompt: "custom-db-prompt", templateId: "tpl_1", templateVersionNo: 5 });

    const mockChat = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        summary: "Summary",
        framework: [{ lessonNo: 1, title: "L1", overview: "O1" }],
      }),
      model: "gpt-4",
      inputTokens: 50,
      outputTokens: 100,
    });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-4",
    });
    mockVersionFindFirst.mockResolvedValue(null);
    mockVersionCreate.mockResolvedValue({ id: "ver-1" });
    mockProjectUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.01);
    mockLogCreate.mockResolvedValue({});

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await POST(req, makeParams("p1"));

    expect(mockChat).toHaveBeenCalledWith(
      expect.objectContaining({ systemPrompt: "custom-db-prompt" })
    );
  });
});
