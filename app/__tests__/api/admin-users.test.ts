import { GET, POST } from "@/app/api/admin/users/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: jest.fn(), create: jest.fn() } },
}));
jest.mock("bcryptjs", () => ({ hash: jest.fn(() => "hashed_pw") }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.user.findMany as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;

const adminSession = { user: { role: "admin" }, expires: "" };

const makePost = (body: object) =>
  new Request("http://localhost/api/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/users", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { role: "teacher" }, expires: "" });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns user list for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([{ id: "1", username: "t1", name: "张老师", role: "teacher" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});

describe("POST /api/admin/users", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost({ username: "t", name: "T", role: "teacher", password: "123456" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing fields", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ username: "t" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("必填");
  });

  it("returns 400 for short password", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ username: "t", name: "T", role: "teacher", password: "123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("6 位");
  });

  it("returns 400 for invalid role", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ username: "t", name: "T", role: "superadmin", password: "123456" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("角色");
  });

  it("creates user successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "2", username: "t2", name: "李老师", role: "teacher" });
    const res = await POST(makePost({ username: "t2", name: "李老师", role: "teacher", password: "123456" }));
    expect(res.status).toBe(201);
    expect((await res.json()).data.username).toBe("t2");
  });

  it("returns 400 for duplicate username", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockRejectedValue({ code: "P2002" });
    const res = await POST(makePost({ username: "dup", name: "D", role: "teacher", password: "123456" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("已存在");
  });
});
