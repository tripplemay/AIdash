import { POST } from "@/app/api/admin/ai-providers/[id]/test/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    aiProvider: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/crypto", () => ({
  decryptApiKey: jest.fn((k: string) => k.replace("enc_", "")),
}));
jest.mock("@/lib/proxy-fetch", () => ({
  proxyFetch: jest.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { proxyFetch } from "@/lib/proxy-fetch";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.aiProvider.findUnique as jest.Mock;
const mockProxyFetch = proxyFetch as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const routeParams = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => jest.clearAllMocks());

describe("POST /api/admin/ai-providers/[id]/test", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", { method: "POST" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(new Request("http://localhost", { method: "POST" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when provider not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", { method: "POST" }), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns success with model count", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://api.example.com/v1/",
      apiKeyEnc: "enc_testkey",
      proxyUrl: null,
    });
    mockProxyFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ data: [{ id: "gpt-4" }, { id: "gpt-3.5" }] }),
    });

    const res = await POST(new Request("http://localhost", { method: "POST" }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.modelCount).toBe(2);
  });

  it("returns error when API returns non-OK", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://api.example.com/v1",
      apiKeyEnc: "enc_testkey",
      proxyUrl: null,
    });
    mockProxyFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const res = await POST(new Request("http://localhost", { method: "POST" }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("401");
  });

  it("returns error when fetch throws", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://api.example.com/v1",
      apiKeyEnc: "enc_testkey",
      proxyUrl: null,
    });
    mockProxyFetch.mockRejectedValue(new Error("Connection refused"));

    const res = await POST(new Request("http://localhost", { method: "POST" }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("Connection refused");
  });
});
