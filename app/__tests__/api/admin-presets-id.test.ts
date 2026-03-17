import { PUT, DELETE } from "@/app/api/admin/presets/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    preset: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.preset.findUnique as jest.Mock;
const mockUpdate = prisma.preset.update as jest.Mock;
const mockDelete = prisma.preset.delete as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const routeParams = { params: Promise.resolve({ id: "pr1" }) };

const makeRequest = (method: string, body?: object) =>
  new Request("http://localhost/api/admin/presets/pr1", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });

beforeEach(() => jest.clearAllMocks());

describe("PUT /api/admin/presets/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makeRequest("PUT", { name: "x" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PUT(makeRequest("PUT", { name: "x" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when preset not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest("PUT", { name: "x" }), routeParams);
    expect(res.status).toBe(404);
  });

  it("updates preset successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "pr1", name: "old", value: "old" });
    const updated = { id: "pr1", name: "new", value: "old" };
    mockUpdate.mockResolvedValue(updated);

    const res = await PUT(makeRequest("PUT", { name: "new" }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("new");
  });
});

describe("DELETE /api/admin/presets/[id]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when preset not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(404);
  });

  it("deletes preset successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "pr1", name: "x" });
    mockDelete.mockResolvedValue({ id: "pr1" });

    const res = await DELETE(makeRequest("DELETE"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
