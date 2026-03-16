import { POST } from "@/app/api/admin/publish/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((fn: Function) => fn({
      coursePackage: { upsert: jest.fn().mockResolvedValue({ id: "pkg-1", slug: "test-course" }) },
      lesson: { upsert: jest.fn().mockResolvedValue({ id: "l-1" }) },
      courseRndPublishRecord: { create: jest.fn().mockResolvedValue({ id: "pr-1" }) },
    })),
  },
}));

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const adminSession = { user: { id: "admin-1", role: "admin" }, expires: "" };
const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeReq = (body: object) =>
  new Request("http://localhost/api/admin/publish", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const validPayload = {
  package: {
    slug: "test-course",
    title: "测试课程包",
    ageRange: "8-12",
    level: "L1",
  },
  lessons: [
    {
      lessonNo: 1,
      title: "第一课",
      durationMinutes: 45,
      contentData: {
        hero: { tags: [], title: "T", subtitle: "S", goal: "G", outcome: "O" },
        sections: [
          { id: "core", title: "T", blocks: [] },
          { id: "ai_value", title: "T", blocks: [] },
          { id: "prep", title: "T", blocks: [] },
          { id: "flow", title: "T", blocks: [] },
          { id: "issues", title: "T", blocks: [] },
          { id: "materials", title: "T", blocks: [] },
          { id: "review", title: "T", blocks: [] },
        ],
      },
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/admin/publish", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(403);
  });

  it("returns 200 for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(201);
  });

  it("returns 200 for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(201);
  });

  it("returns 400 for missing package slug", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeReq({ package: { title: "T" }, lessons: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty lessons", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeReq({ package: validPayload.package, lessons: [] }));
    expect(res.status).toBe(400);
  });
});
