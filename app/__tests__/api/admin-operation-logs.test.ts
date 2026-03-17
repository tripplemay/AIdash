import { GET } from "@/app/api/admin/operation-logs/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    operationLog: { findMany: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.operationLog.findMany as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/operation-logs", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns all logs for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const logs = [
      { id: "l1", action: "create", userId: "u1", user: { name: "Admin", role: "admin" } },
      { id: "l2", action: "update", userId: "u2", user: { name: "RD", role: "rd_manager" } },
    ];
    mockFindMany.mockResolvedValue(logs);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    // admin sees all logs (empty where clause)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("returns only own logs for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    // rd_manager filtered by userId
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "rd-1" } }),
    );
  });

  it("limits to 100 records", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    await GET();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
