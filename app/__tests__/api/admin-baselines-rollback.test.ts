import { POST } from "@/app/api/admin/baselines/[id]/rollback/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDocVersion: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    baselineDoc: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.baselineDocVersion.findUnique as jest.Mock;
const mockFindFirst = prisma.baselineDocVersion.findFirst as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockUpdate = prisma.baselineDoc.update as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const routeParams = { params: Promise.resolve({ id: "b1" }) };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/admin/baselines/b1/rollback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("POST /api/admin/baselines/[id]/rollback", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ versionNo: 1 }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeRequest({ versionNo: 1 }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 400 when versionNo is not a number", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeRequest({ versionNo: "abc" }), routeParams);
    expect(res.status).toBe(400);
  });

  it("returns 404 when target version not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ versionNo: 1 }), routeParams);
    expect(res.status).toBe(404);
  });

  it("rolls back successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ versionNo: 1, content: "old content" });
    mockFindFirst.mockResolvedValue({ versionNo: 3 });
    const newVersion = { id: "v4", versionNo: 4 };
    mockTransaction.mockResolvedValue([newVersion, {}]);
    const finalDoc = { id: "b1", content: "old content", currentVersionId: "v4" };
    mockUpdate.mockResolvedValue(finalDoc);

    const res = await POST(makeRequest({ versionNo: 1 }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.currentVersionId).toBe("v4");
  });
});
