import { POST } from "@/app/api/course-rnd/generate-title/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    promptTemplate: { findUnique: jest.fn() },
    baselineDoc: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/ai/provider", () => ({ getProviderAndModel: jest.fn() }));

import { auth } from "@/auth";
import { getProviderAndModel } from "@/lib/ai/provider";

const mockAuth = auth as jest.Mock;
const mockGetProvider = getProviderAndModel as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/course-rnd/generate-title", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/generate-title", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeRequest({ courseDirection: "test" }));
    expect(res.status).toBe(403);
  });

  it("returns 503 when AI not configured", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockGetProvider.mockRejectedValue(new Error("AI 服务未配置"));
    const res = await POST(makeRequest({ courseDirection: "故事创作" }));
    expect(res.status).toBe(503);
  });

  it("generates title successfully", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const mockChat = jest.fn().mockResolvedValue({
      content: "《AI 故事创作课》",
      inputTokens: 50,
      outputTokens: 10,
      model: "gpt-5",
    });
    mockGetProvider.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-5",
    });

    const res = await POST(makeRequest({
      courseDirection: "AI 故事创作",
      ageRange: "A2",
      level: "L1",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe("AI 故事创作课");
  });

  it("strips quotes from generated title", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const mockChat = jest.fn().mockResolvedValue({
      content: "「小小科学家」",
      inputTokens: 50,
      outputTokens: 10,
      model: "gpt-5",
    });
    mockGetProvider.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-5",
    });

    const res = await POST(makeRequest({ courseDirection: "科学探究" }));
    const json = await res.json();
    expect(json.data.title).toBe("小小科学家");
  });

  it("works with partial input", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const mockChat = jest.fn().mockResolvedValue({
      content: "创意编程课",
      inputTokens: 30,
      outputTokens: 5,
      model: "gpt-5",
    });
    mockGetProvider.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-5",
    });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe("创意编程课");
  });

  it("returns 502 on AI error", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const mockChat = jest.fn().mockRejectedValue(new Error("API timeout"));
    mockGetProvider.mockResolvedValue({
      provider: { chat: mockChat },
      model: "gpt-5",
    });

    const res = await POST(makeRequest({ courseDirection: "test" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("生成失败");
  });
});
