import { GET, DELETE } from "@/app/api/admin/ai-logs/route";
import { GET as GET_DETAIL } from "@/app/api/admin/ai-logs/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndAiCallLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    courseRndProject: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockLogFindMany = prisma.courseRndAiCallLog.findMany as jest.Mock;
const mockLogFindUnique = prisma.courseRndAiCallLog.findUnique as jest.Mock;
const mockLogCount = prisma.courseRndAiCallLog.count as jest.Mock;
const mockLogDeleteMany = prisma.courseRndAiCallLog.deleteMany as jest.Mock;
const mockProjectFindMany = prisma.courseRndProject.findMany as jest.Mock;
const mockProjectFindUnique = prisma.courseRndProject.findUnique as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

beforeEach(() => jest.clearAllMocks());

// ---- GET /api/admin/ai-logs ----
describe("GET /api/admin/ai-logs", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET(new Request("http://localhost/api/admin/ai-logs"));
    expect(res.status).toBe(403);
  });

  it("returns logs for admin without project filter", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockLogFindMany.mockResolvedValue([
      { id: "log-1", projectId: "p1", actionType: "regenerate_lesson", modelName: "gpt-5", inputTokens: 100, outputTokens: 200, estimatedCost: 0.5, createdAt: new Date() },
    ]);
    mockLogCount.mockResolvedValue(1);
    mockProjectFindMany.mockResolvedValue([{ id: "p1", title: "Test Project" }]);

    const res = await GET(new Request("http://localhost/api/admin/ai-logs"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].projectTitle).toBe("Test Project");
    expect(json.total).toBe(1);
  });

  it("filters by project for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindMany.mockResolvedValue([{ id: "p-rd" }]);
    mockLogFindMany.mockResolvedValue([]);
    mockLogCount.mockResolvedValue(0);

    await GET(new Request("http://localhost/api/admin/ai-logs"));
    // Verify projectId filter was applied
    expect(mockLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: { in: ["p-rd"] },
        }),
      }),
    );
  });

  it("applies time range filter", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockLogFindMany.mockResolvedValue([]);
    mockLogCount.mockResolvedValue(0);
    mockProjectFindMany.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/admin/ai-logs?range=today"));
    const where = mockLogFindMany.mock.calls[0][0].where;
    expect(where.createdAt).toBeDefined();
    expect(where.createdAt.gte).toBeInstanceOf(Date);
  });

  it("applies pagination", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockLogFindMany.mockResolvedValue([]);
    mockLogCount.mockResolvedValue(50);
    mockProjectFindMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost/api/admin/ai-logs?page=3&pageSize=10"));
    expect(res.status).toBe(200);
    expect(mockLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

// ---- DELETE /api/admin/ai-logs ----
describe("DELETE /api/admin/ai-logs", () => {
  it("returns 403 for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await DELETE(new Request("http://localhost/api/admin/ai-logs", {
      method: "DELETE",
      body: JSON.stringify({ olderThanDays: 30 }),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(403);
  });

  it("deletes old logs for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockLogDeleteMany.mockResolvedValue({ count: 15 });

    const res = await DELETE(new Request("http://localhost/api/admin/ai-logs", {
      method: "DELETE",
      body: JSON.stringify({ olderThanDays: 30 }),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deleted).toBe(15);
  });

  it("rejects invalid days", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await DELETE(new Request("http://localhost/api/admin/ai-logs", {
      method: "DELETE",
      body: JSON.stringify({ olderThanDays: 15 }),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(400);
  });
});

// ---- GET /api/admin/ai-logs/[id] ----
describe("GET /api/admin/ai-logs/[id]", () => {
  const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET_DETAIL(new Request("http://localhost"), makeParams("log-1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 for missing log", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockLogFindUnique.mockResolvedValue(null);
    const res = await GET_DETAIL(new Request("http://localhost"), makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns full detail for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockLogFindUnique.mockResolvedValue({
      id: "log-1",
      projectId: "p1",
      actionType: "regenerate_lesson",
      modelName: "gpt-5",
      inputTokens: 100,
      outputTokens: 200,
      estimatedCost: 0.5,
      promptLog: "system prompt content",
      messageLog: "user message content",
      createdAt: new Date(),
    });

    const res = await GET_DETAIL(new Request("http://localhost"), makeParams("log-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.promptLog).toBe("system prompt content");
    expect(json.data.messageLog).toBe("user message content");
  });

  it("returns 403 for rd_manager accessing other user project log", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockLogFindUnique.mockResolvedValue({
      id: "log-1",
      projectId: "p-other",
      actionType: "regenerate_lesson",
      modelName: "gpt-5",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      promptLog: null,
      messageLog: null,
      createdAt: new Date(),
    });
    mockProjectFindUnique.mockResolvedValue({ createdById: "other-user" });

    const res = await GET_DETAIL(new Request("http://localhost"), makeParams("log-1"));
    expect(res.status).toBe(403);
  });
});
