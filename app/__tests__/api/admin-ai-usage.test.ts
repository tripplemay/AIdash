import { GET } from "@/app/api/admin/ai-usage/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndAiCallLog: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockGroupBy = prisma.courseRndAiCallLog.groupBy as jest.Mock;
const mockAggregate = prisma.courseRndAiCallLog.aggregate as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeGet = (query = "") =>
  new Request(`http://localhost/api/admin/ai-usage${query}`);

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/ai-usage", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("returns usage data for teacher (all roles allowed)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockGroupBy.mockResolvedValue([]);
    mockAggregate.mockResolvedValue({ _sum: { estimatedCost: 0 }, _count: 0 });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveProperty("byModel");
    expect(json.data).toHaveProperty("byAction");
    expect(json.data).toHaveProperty("totalCost");
    expect(json.data).toHaveProperty("totalCalls");
  });

  it("returns usage data for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockGroupBy.mockResolvedValue([
      { modelName: "gpt-4o", _count: 5, _sum: { inputTokens: 1000, outputTokens: 2000, estimatedCost: 0.1 } },
    ]);
    mockAggregate.mockResolvedValue({ _sum: { estimatedCost: 0.1 }, _count: 5 });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalCalls).toBe(5);
    expect(json.data.totalCost).toBe(0.1);
  });

  it("accepts range=today query param", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockGroupBy.mockResolvedValue([]);
    mockAggregate.mockResolvedValue({ _sum: { estimatedCost: 0 }, _count: 0 });
    const res = await GET(makeGet("?range=today"));
    expect(res.status).toBe(200);
    // Verify groupBy was called with a createdAt filter
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });

  it("accepts range=week query param", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockGroupBy.mockResolvedValue([]);
    mockAggregate.mockResolvedValue({ _sum: { estimatedCost: 0 }, _count: 0 });
    const res = await GET(makeGet("?range=week"));
    expect(res.status).toBe(200);
  });

  it("accepts range=month query param", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockGroupBy.mockResolvedValue([]);
    mockAggregate.mockResolvedValue({ _sum: { estimatedCost: 0 }, _count: 0 });
    const res = await GET(makeGet("?range=month"));
    expect(res.status).toBe(200);
  });

  it("defaults to all when range=all", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockGroupBy.mockResolvedValue([]);
    mockAggregate.mockResolvedValue({ _sum: { estimatedCost: null }, _count: 0 });
    const res = await GET(makeGet("?range=all"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalCost).toBe(0);
    // When range=all, where should be empty (no createdAt filter)
    expect(mockAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
