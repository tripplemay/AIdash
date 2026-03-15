import { PATCH, DELETE } from "@/app/api/admin/users/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { update: jest.fn(), delete: jest.fn() } },
}));
jest.mock("bcryptjs", () => ({ hash: jest.fn(() => "hashed_pw") }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockDelete = prisma.user.delete as jest.Mock;

const adminSession = { user: { id: "admin-1", role: "admin" }, expires: "" };
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const makePatch = (body: object) =>
  new Request("http://localhost/api/admin/users/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/admin/users/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makePatch({ name: "X" }), makeParams("1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makePatch({ role: "superadmin" }), makeParams("1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makePatch({ newPassword: "12" }), makeParams("1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty update", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makePatch({}), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("无更新");
  });

  it("updates user name", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockUpdate.mockResolvedValue({ id: "1", username: "t", name: "New", role: "teacher" });
    const res = await PATCH(makePatch({ name: "New" }), makeParams("1"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.name).toBe("New");
  });

  it("resets password", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockUpdate.mockResolvedValue({ id: "1", username: "t", name: "T", role: "teacher" });
    const res = await PATCH(makePatch({ newPassword: "newpass123" }), makeParams("1"));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ password: "hashed_pw" }),
    }));
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when deleting self", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await DELETE(new Request("http://localhost"), makeParams("admin-1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("自身");
  });

  it("deletes user successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDelete.mockResolvedValue({});
    const res = await DELETE(new Request("http://localhost"), makeParams("other-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
