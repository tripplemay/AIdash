import { GET, POST } from "@/app/api/admin/ai-providers/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { aiProvider: { findMany: jest.fn(), create: jest.fn() } },
}));
jest.mock("@/lib/crypto", () => ({
  encryptApiKey: jest.fn((k: string) => `enc_${k}`),
  maskApiKey: jest.fn((k: string) => `***${k.slice(-4)}`),
  decryptApiKey: jest.fn((k: string) => k.replace("enc_", "")),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.aiProvider.findMany as jest.Mock;
const mockCreate = prisma.aiProvider.create as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePost = (body: object) =>
  new Request("http://localhost/api/admin/ai-providers", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/ai-providers", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns provider list for teacher (all roles allowed)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindMany.mockResolvedValue([
      { id: "p1", name: "OpenAI", apiKeyEnc: "enc_sk-1234abcd" },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].apiKeyEnc).toBeUndefined();
    expect(json.data[0].apiKeyMasked).toBeDefined();
  });

  it("returns provider list for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });
});

describe("POST /api/admin/ai-providers", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost({ name: "X", baseUrl: "http://a", apiKey: "k" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin (teacher)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost({ name: "X", baseUrl: "http://a", apiKey: "k" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ name: "X" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("必填");
  });

  it("returns 400 when apiKey is missing", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ name: "X", baseUrl: "http://a" }));
    expect(res.status).toBe(400);
  });

  it("creates provider successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const created = {
      id: "p1", name: "OpenAI", baseUrl: "https://api.openai.com",
      apiKeyEnc: "enc_sk-test1234", protocol: "openai",
      supportText: true, supportImage: false, proxyUrl: null,
    };
    mockCreate.mockResolvedValue(created);
    const res = await POST(makePost({
      name: "OpenAI", baseUrl: "https://api.openai.com", apiKey: "sk-test1234",
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.apiKeyEnc).toBeUndefined();
    expect(json.data.apiKeyMasked).toBeDefined();
  });

  it("normalizes baseUrl by stripping trailing path segments", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "p2", name: "X", baseUrl: "https://api.example.com", apiKeyEnc: "enc_k" });
    await POST(makePost({
      name: "X", baseUrl: "https://api.example.com/chat/completions", apiKey: "k",
    }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baseUrl: "https://api.example.com",
        }),
      }),
    );
  });
});
