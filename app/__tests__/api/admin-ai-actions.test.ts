import { GET, POST } from "@/app/api/admin/ai-actions/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    aiActionConfig: { findMany: jest.fn(), upsert: jest.fn(), findUnique: jest.fn() },
    aiProvider: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/crypto", () => ({
  decryptApiKey: jest.fn((k: string) => k.replace("enc_", "")),
}));
jest.mock("@/lib/ai/pricing-service", () => ({
  testModel: jest.fn(),
  fetchModelPricing: jest.fn(),
  getUsdToCny: jest.fn(() => 7.2),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { testModel, fetchModelPricing } from "@/lib/ai/pricing-service";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.aiActionConfig.findMany as jest.Mock;
const mockUpsert = prisma.aiActionConfig.upsert as jest.Mock;
const mockFindUniqueAction = prisma.aiActionConfig.findUnique as jest.Mock;
const mockFindProvider = prisma.aiProvider.findUnique as jest.Mock;
const mockTestModel = testModel as jest.Mock;
const mockFetchPricing = fetchModelPricing as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePost = (body: object) =>
  new Request("http://localhost/api/admin/ai-actions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/ai-actions", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns action list for teacher (all roles allowed)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindMany.mockResolvedValue([
      { actionKey: "generate_framework", provider: { id: "p1", name: "OpenAI" } },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("returns action list for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/ai-actions", () => {
  const validBody = {
    actionKey: "generate_framework",
    actionLabel: "生成框架",
    actionType: "text",
    providerId: "p1",
    modelName: "gpt-4o",
  };

  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ actionKey: "x" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("必填");
  });

  it("returns 404 when provider not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindProvider.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 422 when model test fails", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindProvider.mockResolvedValue({
      id: "p1", baseUrl: "https://api.openai.com", apiKeyEnc: "enc_sk-test", proxyUrl: null,
    });
    mockTestModel.mockResolvedValue({ success: false, error: "Connection refused" });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.testFailed).toBe(true);
  });

  it("creates action successfully with auto pricing", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindProvider.mockResolvedValue({
      id: "p1", baseUrl: "https://api.openai.com", apiKeyEnc: "enc_sk-test", proxyUrl: null,
    });
    mockTestModel.mockResolvedValue({ success: true });
    mockFetchPricing.mockResolvedValue({ inputPricePerM: 5, outputPricePerM: 15 });
    const result = { ...validBody, provider: { id: "p1", name: "OpenAI" } };
    mockUpsert.mockResolvedValue(result);
    mockFindUniqueAction.mockResolvedValue(result);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.actionKey).toBe("generate_framework");
  });

  it("skips model test for image actionType", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindProvider.mockResolvedValue({
      id: "p1", baseUrl: "https://api.openai.com", apiKeyEnc: "enc_sk-test", proxyUrl: null,
    });
    const imageBody = { ...validBody, actionType: "image", pricePerCall: 0.04 };
    mockUpsert.mockResolvedValue({});
    mockFindUniqueAction.mockResolvedValue({ ...imageBody, provider: { id: "p1", name: "OpenAI" } });
    const res = await POST(makePost(imageBody));
    expect(res.status).toBe(200);
    expect(mockTestModel).not.toHaveBeenCalled();
  });

  it("skips model test when skipTest is true", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindProvider.mockResolvedValue({
      id: "p1", baseUrl: "https://api.openai.com", apiKeyEnc: "enc_sk-test", proxyUrl: null,
    });
    mockFetchPricing.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({});
    mockFindUniqueAction.mockResolvedValue({ ...validBody, provider: { id: "p1", name: "OpenAI" } });
    const res = await POST(makePost({ ...validBody, skipTest: true }));
    expect(res.status).toBe(200);
    expect(mockTestModel).not.toHaveBeenCalled();
  });
});
