import { PATCH, DELETE } from "@/app/api/admin/ai-providers/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    aiProvider: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    aiActionConfig: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/crypto", () => ({
  encryptApiKey: jest.fn((k: string) => `enc_${k}`),
  maskApiKey: jest.fn((k: string) => `***${k.slice(-4)}`),
  decryptApiKey: jest.fn((k: string) => k.replace("enc_", "")),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.aiProvider.findUnique as jest.Mock;
const mockUpdate = prisma.aiProvider.update as jest.Mock;
const mockDelete = prisma.aiProvider.delete as jest.Mock;
const mockFindActions = prisma.aiActionConfig.findMany as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeRequest = (method: string, body?: object) =>
  new Request("http://localhost/api/admin/ai-providers/p1", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });

const routeParams = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/admin/ai-providers/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "X" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PATCH(makeRequest("PATCH", { name: "X" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when provider not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { name: "X" }), routeParams);
    expect(res.status).toBe(404);
  });

  it("updates provider successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "p1", name: "Old", apiKeyEnc: "enc_oldkey" });
    const updated = { id: "p1", name: "New", apiKeyEnc: "enc_oldkey" };
    mockUpdate.mockResolvedValue(updated);
    const res = await PATCH(makeRequest("PATCH", { name: "New" }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.apiKeyEnc).toBeUndefined();
    expect(json.data.apiKeyMasked).toBeDefined();
  });

  it("updates apiKey when provided", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "p1", name: "X", apiKeyEnc: "enc_old" });
    mockUpdate.mockResolvedValue({ id: "p1", name: "X", apiKeyEnc: "enc_newkey" });
    const res = await PATCH(makeRequest("PATCH", { apiKey: "newkey" }), routeParams);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ apiKeyEnc: "enc_newkey" }),
      }),
    );
  });
});

describe("DELETE /api/admin/ai-providers/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when provider not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns 409 when provider has linked actions", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "p1", name: "X" });
    mockFindActions.mockResolvedValue([
      { actionKey: "generate_framework", actionLabel: "生成框架" },
    ]);
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("生成框架");
  });

  it("deletes provider successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "p1", name: "X" });
    mockFindActions.mockResolvedValue([]);
    mockDelete.mockResolvedValue({ id: "p1" });
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("p1");
  });
});
