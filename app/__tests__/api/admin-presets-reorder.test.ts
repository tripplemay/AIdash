import { PUT } from "@/app/api/admin/presets/reorder/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    preset: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/admin/presets/reorder", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("PUT /api/admin/presets/reorder", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makeRequest({ ids: ["a", "b"] }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PUT(makeRequest({ ids: ["a", "b"] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when ids is not an array", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PUT(makeRequest({ ids: "not-array" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when ids is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PUT(makeRequest({ ids: [] }));
    expect(res.status).toBe(400);
  });

  it("reorders presets successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockTransaction.mockResolvedValue([]);

    const res = await PUT(makeRequest({ ids: ["pr1", "pr2", "pr3"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
  });
});
