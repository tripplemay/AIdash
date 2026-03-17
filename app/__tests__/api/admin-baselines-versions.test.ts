import { GET } from "@/app/api/admin/baselines/[id]/versions/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDocVersion: { findMany: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.baselineDocVersion.findMany as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const routeParams = { params: Promise.resolve({ id: "b1" }) };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/baselines/[id]/versions", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns versions for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([
      { id: "v2", versionNo: 2 },
      { id: "v1", versionNo: 1 },
    ]);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });

  it("returns versions for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindMany.mockResolvedValue([]);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
  });

  it("queries with correct baselineDocId and order", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    await GET(new Request("http://localhost"), routeParams);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { baselineDocId: "b1" },
      orderBy: { versionNo: "desc" },
    });
  });
});
