import { GET, POST } from "@/app/api/admin/packages/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coursePackage: { findMany: jest.fn(), create: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockFindMany = prisma.coursePackage.findMany as jest.MockedFunction<
  typeof prisma.coursePackage.findMany
>;
const mockCreate = prisma.coursePackage.create as jest.MockedFunction<
  typeof prisma.coursePackage.create
>;

const adminSession = { user: { role: "admin" }, expires: "" };
const teacherSession = { user: { role: "teacher" }, expires: "" };

const makePostReq = (body: object) =>
  new Request("http://localhost/api/admin/packages", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/packages", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "无权限" });
  });

  it("returns 403 when authenticated but not admin", async () => {
    mockAuth.mockResolvedValue(teacherSession as any);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns all packages for admin", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    const packages = [{ id: 1 }, { id: 2 }];
    mockFindMany.mockResolvedValue(packages as any);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: packages });
  });
});

describe("POST /api/admin/packages", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await POST(makePostReq({ slug: "a", title: "b", ageRange: "6-8", level: "1" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockResolvedValue(teacherSession as any);
    const res = await POST(makePostReq({ slug: "a", title: "b", ageRange: "6-8", level: "1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields missing", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    const res = await POST(makePostReq({ slug: "a" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "缺少必填字段" });
  });

  it("returns 400 when slug is missing", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    const res = await POST(makePostReq({ title: "b", ageRange: "6-8", level: "1" }));
    expect(res.status).toBe(400);
  });

  it("creates package and returns 201 with valid data", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    const created = { id: 1, slug: "new-pkg", title: "新课程包" };
    mockCreate.mockResolvedValue(created as any);
    const res = await POST(
      makePostReq({ slug: "new-pkg", title: "新课程包", ageRange: "6-8", level: "1" })
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: created });
  });

  it("passes optional fields to prisma create", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    mockCreate.mockResolvedValue({ id: 1 } as any);
    await POST(
      makePostReq({
        slug: "pkg",
        title: "课程",
        ageRange: "6-8",
        level: "1",
        summary: "简介",
        coverImage: "/img.png",
      })
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ summary: "简介", coverImage: "/img.png" }),
      })
    );
  });
});
