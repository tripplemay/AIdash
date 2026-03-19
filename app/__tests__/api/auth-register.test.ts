import { POST } from "@/app/api/auth/register/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    inviteCode: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("bcryptjs", () => ({
  hash: jest.fn(() => "hashed_pw"),
}));

import { prisma } from "@/lib/prisma";

const mockInviteFind = prisma.inviteCode.findUnique as jest.Mock;
const mockUserFind = prisma.user.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const makePost = (body: object) =>
  new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const validBody = {
  inviteCode: "ABC12345",
  username: "newuser",
  password: "newpwd123",
  name: "新用户",
};

const validInvite = {
  id: "inv1",
  code: "ABC12345",
  isActive: true,
  expiresAt: new Date(Date.now() + 86400000),
  maxUses: 10,
  usedCount: 0,
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/auth/register", () => {
  it("returns 400 for missing fields", async () => {
    const res = await POST(makePost({ username: "u" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("必填");
  });

  it("returns 400 for invalid invite code", async () => {
    mockInviteFind.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("无效");
  });

  it("returns 400 for expired invite code", async () => {
    mockInviteFind.mockResolvedValue({
      ...validInvite,
      expiresAt: new Date(Date.now() - 86400000),
    });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("过期");
  });

  it("returns 400 for used-up invite code", async () => {
    mockInviteFind.mockResolvedValue({
      ...validInvite,
      usedCount: 10,
    });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("次数已满");
  });

  it("registers user successfully", async () => {
    mockInviteFind.mockResolvedValue(validInvite);
    mockUserFind.mockResolvedValue(null);
    const createdUser = {
      id: "u1",
      username: "newuser",
      name: "新用户",
      role: "rd_manager",
      createdAt: new Date(),
    };
    mockTransaction.mockResolvedValue([createdUser, {}]);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.username).toBe("newuser");
  });

  it("returns 400 for duplicate username", async () => {
    mockInviteFind.mockResolvedValue(validInvite);
    mockUserFind.mockResolvedValue({ id: "existing" });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("已存在");
  });
});
