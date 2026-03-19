import { POST } from "@/app/api/user/password/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn(), update: jest.fn() } },
}));
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(() => "hashed_new_pw"),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockCompare = bcrypt.compare as jest.Mock;

const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePost = (body: object) =>
  new Request("http://localhost/api/user/password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("POST /api/user/password", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost({ currentPassword: "old", newPassword: "newpwd123" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for wrong current password", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({ password: "hashed_old" });
    mockCompare.mockResolvedValue(false);
    const res = await POST(makePost({ currentPassword: "wrong", newPassword: "newpwd123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("当前密码不正确");
  });

  it("returns 400 for short new password", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost({ currentPassword: "old", newPassword: "12" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("6");
  });

  it("changes password successfully", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({ password: "hashed_old" });
    mockCompare.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});
    const res = await POST(makePost({ currentPassword: "old123", newPassword: "newpwd123" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t-1" },
        data: { password: "hashed_new_pw" },
      })
    );
  });

  it("returns 400 when missing fields", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost({ currentPassword: "old" }));
    expect(res.status).toBe(400);
  });
});
