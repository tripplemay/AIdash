import { GET, POST } from "@/app/api/admin/departments/route";
import { PATCH, DELETE } from "@/app/api/admin/departments/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.department.findMany as jest.Mock;
const mockCreate = prisma.department.create as jest.Mock;
const mockUpdate = prisma.department.update as jest.Mock;
const mockDelete = prisma.department.delete as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePost = (body: object) =>
  new Request("http://localhost/api/admin/departments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const makePatch = (body: object) =>
  new Request("http://localhost/api/admin/departments/d1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const makeDelete = () =>
  new Request("http://localhost/api/admin/departments/d1", { method: "DELETE" });

const paramsD1 = Promise.resolve({ id: "d1" });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/departments", () => {
  it("returns department list for any authenticated role", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const depts = [{ id: "d1", name: "教研部", sortOrder: 0 }];
    mockFindMany.mockResolvedValue(depts);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(depts);
  });

  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/departments", () => {
  it("creates department for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const dept = { id: "d2", name: "技术部", sortOrder: 0 };
    mockCreate.mockResolvedValue(dept);
    const res = await POST(makePost({ name: "技术部" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("技术部");
  });

  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost({ name: "技术部" }));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/departments/[id]", () => {
  it("renames department for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const dept = { id: "d1", name: "新名称", sortOrder: 0 };
    mockUpdate.mockResolvedValue(dept);
    const res = await PATCH(makePatch({ name: "新名称" }), { params: paramsD1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("新名称");
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PATCH(makePatch({ name: "x" }), { params: paramsD1 });
    expect(res.status).toBe(403);
  });

  it("returns 400 for duplicate name (P2002)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const error = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mockUpdate.mockRejectedValue(error);
    const res = await PATCH(makePatch({ name: "已存在" }), { params: paramsD1 });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("部门名称已存在");
  });

  it("returns 404 for nonexistent department (P2025)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const error = Object.assign(new Error("Record not found"), { code: "P2025" });
    mockUpdate.mockRejectedValue(error);
    const res = await PATCH(makePatch({ name: "新名称" }), { params: paramsD1 });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("部门不存在");
  });

  it("returns 400 for empty name", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makePatch({ name: "  " }), { params: paramsD1 });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("部门名称不能为空");
  });
});

describe("DELETE /api/admin/departments/[id]", () => {
  it("deletes department for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDelete.mockResolvedValue({});
    const res = await DELETE(makeDelete(), { params: paramsD1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await DELETE(makeDelete(), { params: paramsD1 });
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent department (P2025)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const error = Object.assign(new Error("Record not found"), { code: "P2025" });
    mockDelete.mockRejectedValue(error);
    const res = await DELETE(makeDelete(), { params: paramsD1 });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("部门不存在");
  });
});
