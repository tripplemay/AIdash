import { GET } from "@/app/api/admin/baselines/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDoc: { findMany: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.baselineDoc.findMany as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };
const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/baselines", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns baselines for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([
      { id: "b1", type: "general", title: "通用基线", content: "..." },
      { id: "b2", type: "age", title: "A1 年龄段", content: "..." },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });

  it("returns baselines for teacher (all roles allowed)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });

  it("returns baselines for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindMany.mockResolvedValue([{ id: "b1", type: "general", title: "通用" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("orders by type asc and sortOrder asc", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    await GET();
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });
  });
});
