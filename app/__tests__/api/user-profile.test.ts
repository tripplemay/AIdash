import { GET, PATCH } from "@/app/api/user/profile/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn(), update: jest.fn() } },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePatch = (body: object) =>
  new Request("http://localhost/api/user/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/user/profile", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns user profile for authenticated user", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const profile = {
      id: "t-1",
      username: "teacher01",
      name: "张老师",
      email: "t@example.com",
      phone: "13800000000",
      avatarUrl: null,
      role: "teacher",
      departmentId: null,
      department: null,
    };
    mockFindUnique.mockResolvedValue(profile);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(profile);
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t-1" } })
    );
  });

  it("returns 404 when user not found in DB", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/user/profile", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makePatch({ name: "新名字" }));
    expect(res.status).toBe(403);
  });

  it("updates profile fields successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const updated = {
      id: "a-1",
      username: "admin",
      name: "新名字",
      email: null,
      phone: null,
      avatarUrl: null,
      role: "admin",
      departmentId: null,
      department: null,
    };
    mockUpdate.mockResolvedValue(updated);
    const res = await PATCH(makePatch({ name: "新名字" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("新名字");
  });

  it("returns 400 for invalid email format", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makePatch({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("邮箱");
  });

  it("returns 400 when no update fields provided", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makePatch({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("无更新字段");
  });
});
