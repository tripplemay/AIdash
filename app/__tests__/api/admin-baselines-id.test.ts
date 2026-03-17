import { GET, PUT } from "@/app/api/admin/baselines/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDoc: { findUnique: jest.fn(), update: jest.fn() },
    baselineDocVersion: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.baselineDoc.findUnique as jest.Mock;
const mockUpdate = prisma.baselineDoc.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const routeParams = { params: Promise.resolve({ id: "b1" }) };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/admin/baselines/b1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/baselines/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when baseline not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns baseline for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const doc = { id: "b1", type: "general", title: "通用基线", content: "..." };
    mockFindUnique.mockResolvedValue(doc);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("b1");
  });

  it("returns baseline for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({ id: "b1", content: "x" });
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
  });

  it("returns baseline for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({ id: "b1", content: "x" });
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/admin/baselines/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makeRequest({ content: "new" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PUT(makeRequest({ content: "new" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 400 when content is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PUT(makeRequest({}), routeParams);
    expect(res.status).toBe(400);
  });

  it("returns 404 when baseline not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest({ content: "new" }), routeParams);
    expect(res.status).toBe(404);
  });

  it("updates baseline successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "b1",
      content: "old",
      versions: [{ versionNo: 2 }],
    });
    const version = { id: "v3", versionNo: 3 };
    mockTransaction.mockResolvedValue([version, { id: "b1" }]);
    const finalDoc = { id: "b1", content: "new", currentVersionId: "v3" };
    mockUpdate.mockResolvedValue(finalDoc);

    const res = await PUT(makeRequest({ content: "new", editSummary: "更新" }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.currentVersionId).toBe("v3");
  });
});
