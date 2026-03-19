import { GET, POST } from "@/app/api/admin/invites/route";
import { PATCH, DELETE } from "@/app/api/admin/invites/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    inviteCode: {
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
const mockFindMany = prisma.inviteCode.findMany as jest.Mock;
const mockCreate = prisma.inviteCode.create as jest.Mock;
const mockUpdate = prisma.inviteCode.update as jest.Mock;
const mockDelete = prisma.inviteCode.delete as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePost = (body: object) =>
  new Request("http://localhost/api/admin/invites", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const makePatch = (body: object) =>
  new Request("http://localhost/api/admin/invites/inv1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const makeDelete = () =>
  new Request("http://localhost/api/admin/invites/inv1", { method: "DELETE" });

const paramsInv1 = Promise.resolve({ id: "inv1" });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/invites", () => {
  it("lists invite codes for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const invites = [{ id: "inv1", code: "ABC12345", maxUses: 5, usedCount: 0 }];
    mockFindMany.mockResolvedValue(invites);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(invites);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/invites", () => {
  it("generates invite code for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const invite = { id: "inv2", code: "XYZ99999", maxUses: 10, usedCount: 0 };
    mockCreate.mockResolvedValue(invite);
    const res = await POST(makePost({ maxUses: 10, expiresInDays: 7 }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.code).toBeDefined();
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost({ maxUses: 10, expiresInDays: 7 }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid maxUses", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ maxUses: 0, expiresInDays: 7 }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/invites/[id]", () => {
  it("toggles isActive for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const invite = { id: "inv1", isActive: false };
    mockUpdate.mockResolvedValue(invite);
    const res = await PATCH(makePatch({ isActive: false }), { params: paramsInv1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isActive).toBe(false);
  });

  it("returns 400 for non-boolean isActive", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makePatch({ isActive: "yes" }), { params: paramsInv1 });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/invites/[id]", () => {
  it("deletes invite code for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDelete.mockResolvedValue({});
    const res = await DELETE(makeDelete(), { params: paramsInv1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await DELETE(makeDelete(), { params: paramsInv1 });
    expect(res.status).toBe(403);
  });
});
