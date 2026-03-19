import { GET, PUT } from "@/app/api/admin/system-config/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth-utils", () => ({
  requireRole: jest.fn(),
  forbiddenResponse: jest.fn(() => new Response("Forbidden", { status: 403 })),
}));

jest.mock("@/lib/crypto", () => ({
  encryptApiKey: jest.fn((v: string) => `enc_${v}`),
  decryptApiKey: jest.fn((v: string) => v.replace("enc_", "")),
  maskApiKey: jest.fn((v: string) => v.slice(0, 4) + "****"),
}));

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";

const mockRequireRole = requireRole as jest.Mock;
const mockFindMany = prisma.systemConfig.findMany as jest.Mock;
const mockUpsert = prisma.systemConfig.upsert as jest.Mock;

const adminSession = { user: { id: "admin1", role: "admin" } };

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireRole.mockResolvedValue(adminSession);
});

describe("GET /api/admin/system-config", () => {
  it("returns 403 for non-admin", async () => {
    mockRequireRole.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns config entries with masked encrypted values", async () => {
    mockFindMany.mockResolvedValue([
      { key: "tavily_api_key", value: "enc_tvly-abc123xyz", updatedAt: new Date() },
      { key: "usd_to_cny", value: "7.25", updatedAt: new Date() },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);

    const tavily = json.data.find((d: { key: string }) => d.key === "tavily_api_key");
    expect(tavily.isConfigured).toBe(true);
    expect(tavily.value).toContain("****"); // masked

    const usd = json.data.find((d: { key: string }) => d.key === "usd_to_cny");
    expect(usd.value).toBe("7.25"); // not encrypted, shown as-is
  });

  it("adds missing keys as unconfigured", async () => {
    mockFindMany.mockResolvedValue([]); // no configs exist

    const res = await GET();
    const json = await res.json();
    expect(json.data).toHaveLength(2); // tavily_api_key + usd_to_cny
    expect(json.data.every((d: { isConfigured: boolean }) => !d.isConfigured)).toBe(true);
  });

  it("handles decrypt failure gracefully", async () => {
    mockFindMany.mockResolvedValue([
      { key: "tavily_api_key", value: "corrupted_data", updatedAt: new Date() },
    ]);
    // decryptApiKey will throw on corrupted data
    const { decryptApiKey } = require("@/lib/crypto");
    (decryptApiKey as jest.Mock).mockImplementationOnce(() => { throw new Error("bad"); });

    const res = await GET();
    const json = await res.json();
    const tavily = json.data.find((d: { key: string }) => d.key === "tavily_api_key");
    expect(tavily.value).toBe("****");
  });
});

describe("PUT /api/admin/system-config", () => {
  it("returns 403 for non-admin", async () => {
    mockRequireRole.mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/system-config", {
      method: "PUT",
      body: JSON.stringify({ key: "tavily_api_key", value: "tvly-test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing key", async () => {
    const req = new Request("http://localhost/api/admin/system-config", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("配置键");
  });

  it("returns 400 for disallowed key", async () => {
    const req = new Request("http://localhost/api/admin/system-config", {
      method: "PUT",
      body: JSON.stringify({ key: "secret_hack", value: "bad" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("不允许");
  });

  it("encrypts tavily_api_key before storing", async () => {
    mockUpsert.mockResolvedValue({});
    const req = new Request("http://localhost/api/admin/system-config", {
      method: "PUT",
      body: JSON.stringify({ key: "tavily_api_key", value: "tvly-test123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "tavily_api_key" },
        update: { value: "enc_tvly-test123" },
        create: { key: "tavily_api_key", value: "enc_tvly-test123" },
      })
    );
  });

  it("stores non-encrypted key as plain text", async () => {
    mockUpsert.mockResolvedValue({});
    const req = new Request("http://localhost/api/admin/system-config", {
      method: "PUT",
      body: JSON.stringify({ key: "usd_to_cny", value: "7.30" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { value: "7.30" },
      })
    );
  });
});
