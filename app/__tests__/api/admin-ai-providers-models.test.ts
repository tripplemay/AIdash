import { GET } from "@/app/api/admin/ai-providers/[id]/models/route";

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

describe("GET /api/admin/ai-providers/[id]/models", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when provider not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns models sorted by id", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://api.example.com/v1/",
      apiKeyEnc: "enc_key",
      proxyUrl: null,
    });
    mockProxyFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        data: [
          { id: "gpt-4", name: "GPT-4" },
          { id: "claude-3", name: "Claude 3" },
        ],
      }),
    });

    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    // sorted alphabetically
    expect(json.data[0].id).toBe("claude-3");
    expect(json.data[1].id).toBe("gpt-4");
  });

  it("parses pricing from OpenRouter format", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyEnc: "enc_key",
      proxyUrl: null,
    });
    mockProxyFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        data: [
          {
            id: "model-1",
            pricing: { prompt: "0.000001", completion: "0.000002" },
          },
        ],
      }),
    });

    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data[0].pricing.inputPerM).toBe(1);
    expect(json.data[0].pricing.outputPerM).toBe(2);
  });

  it("returns 502 when API returns non-OK", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://api.example.com/v1",
      apiKeyEnc: "enc_key",
      proxyUrl: null,
    });
    mockProxyFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(502);
  });

  it("allows teacher access", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://api.example.com/v1",
      apiKeyEnc: "enc_key",
      proxyUrl: null,
    });
    mockProxyFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ data: [] }),
    });

    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
  });

  it("returns 502 when fetch throws", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      baseUrl: "https://api.example.com/v1",
      apiKeyEnc: "enc_key",
      proxyUrl: null,
    });
    mockProxyFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("ECONNREFUSED");
  });
});
