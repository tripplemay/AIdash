import { POST } from "@/app/api/course-rnd/projects/[id]/revise-framework/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courseRndDirectionVersion: {
      findUnique: jest.fn(),
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
  reviseFrameworkPrompt: jest.fn(() => "revise-prompt"),
  getBaselinePrompt: jest.fn(() => "baseline-prompt"),
}));
jest.mock("@/lib/ai/template-engine", () => ({ resolveTemplate: jest.fn() }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { resolveTemplate } from "@/lib/ai/template-engine";

const mockAuth = auth as jest.Mock;
const mockProjectFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockProjectUpdate = prisma.courseRndProject.update as jest.Mock;
const mockVersionFindUnique = prisma.courseRndDirectionVersion.findUnique as jest.Mock;
const mockVersionFindFirst = prisma.courseRndDirectionVersion.findFirst as jest.Mock;
const mockVersionCreate = prisma.courseRndDirectionVersion.create as jest.Mock;
const mockLogCreate = prisma.courseRndAiCallLog.create as jest.Mock;
const mockGetProviderAndModel = getProviderAndModel as jest.Mock;
const mockCalculateCost = calculateCallCostFromDb as jest.Mock;
const mockResolveTemplate = resolveTemplate as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const makeRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/course-rnd/projects/p1/revise-framework", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const sampleProject = {
  title: "Test Course",
  courseDirection: "AI",
  ageRange: "A1",
  level: "L1",
  orgForm: "S1",
  deliverableType: "P1",
  deliverableName: null,
  coreDeliverable: "Robot",
  imageStylePrompt: null,
  coreNeeds: null,
  constraints: null,
  currentDirectionVersionId: "dv-1",
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/revise-framework", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeRequest({ feedback: "change it" }), makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when feedback is missing", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await POST(makeRequest({}), makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("请输入修改意见");
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ feedback: "change it" }), makeParams("nonexistent"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("项目不存在");
  });

  it("returns 400 when no current direction version", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue({ ...sampleProject, currentDirectionVersionId: null });
    const res = await POST(makeRequest({ feedback: "change it" }), makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("尚未生成框架");
  });

  it("returns 400 when current version has no frameworkJson", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockVersionFindUnique.mockResolvedValue({ frameworkJson: null, summary: null });
    const res = await POST(makeRequest({ feedback: "change it" }), makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("当前框架数据不存在");
  });

  it("returns 503 when AI provider is not configured", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockVersionFindUnique.mockResolvedValue({
      frameworkJson: JSON.stringify([{ lessonNo: 1, title: "L1", overview: "O1" }]),
      summary: "Summary",
    });
    mockGetProviderAndModel.mockRejectedValue(new Error("AI 服务未配置"));

    const res = await POST(makeRequest({ feedback: "change it" }), makeParams("p1"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("AI 服务未配置");
  });

  it("calls AI and creates revised version on success", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockVersionFindUnique.mockResolvedValue({
      frameworkJson: JSON.stringify([{ lessonNo: 1, title: "L1", overview: "O1" }]),
      summary: "Old summary",
    });
    mockResolveTemplate.mockResolvedValue(null);

    const mockChat = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        summary: "Revised summary",
        framework: [{ lessonNo: 1, title: "L1 revised", overview: "O1 revised" }],
      }),
      model: "gpt-4",
      inputTokens: 150,
      outputTokens: 250,
    });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-4",
    });
    mockVersionFindFirst.mockResolvedValue({ versionNo: 1 });
    mockVersionCreate.mockResolvedValue({ id: "ver-2" });
    mockProjectUpdate.mockResolvedValue({});
    mockCalculateCost.mockResolvedValue(0.08);
    mockLogCreate.mockResolvedValue({});

    const res = await POST(makeRequest({ feedback: "change the title" }), makeParams("p1"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.directionVersionId).toBe("ver-2");
    expect(json.data.versionNo).toBe(2);
    expect(json.data.summary).toBe("Revised summary");

    expect(mockChat).toHaveBeenCalledTimes(1);
    expect(mockVersionCreate).toHaveBeenCalledTimes(1);
    expect(mockLogCreate).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when AI output cannot be parsed", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(sampleProject);
    mockVersionFindUnique.mockResolvedValue({
      frameworkJson: JSON.stringify([{ lessonNo: 1, title: "L1", overview: "O1" }]),
      summary: "Summary",
    });
    mockResolveTemplate.mockResolvedValue(null);

    const mockChat = jest.fn().mockResolvedValue({
      content: "Not valid JSON",
      model: "gpt-4",
      inputTokens: 100,
      outputTokens: 200,
    });
    mockGetProviderAndModel.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-4",
    });

    const res = await POST(makeRequest({ feedback: "change it" }), makeParams("p1"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("AI 输出解析失败");
  });
});
