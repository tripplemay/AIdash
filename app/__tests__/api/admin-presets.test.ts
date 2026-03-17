import { GET, POST } from "@/app/api/admin/presets/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    preset: { findMany: jest.fn(), create: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.preset.findMany as jest.Mock;
const mockCreate = prisma.preset.create as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeGet = (query = "") =>
  new Request(`http://localhost/api/admin/presets${query}`);

const makePost = (body: object) =>
  new Request("http://localhost/api/admin/presets", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/presets", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("returns presets for teacher (all roles allowed)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindMany.mockResolvedValue([
      { id: "pr1", category: "direction", name: "科技", value: "tech" },
    ]);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("filters by category query param", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    await GET(makeGet("?category=direction"));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: "direction" },
      }),
    );
  });

  it("returns all presets when no category filter", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    await GET(makeGet());
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      }),
    );
  });
});

describe("POST /api/admin/presets", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost({ category: "x", name: "y", value: "z" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost({ category: "x", name: "y", value: "z" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ category: "x" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("必填");
  });

  it("returns 400 when value is missing", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makePost({ category: "x", name: "y" }));
    expect(res.status).toBe(400);
  });

  it("creates preset successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const created = { id: "pr1", category: "direction", name: "科技", value: "tech", sortOrder: 0 };
    mockCreate.mockResolvedValue(created);
    const res = await POST(makePost({ category: "direction", name: "科技", value: "tech" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("科技");
  });

  it("uses provided sortOrder", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "pr2", category: "style", name: "卡通", value: "cartoon", sortOrder: 5 });
    await POST(makePost({ category: "style", name: "卡通", value: "cartoon", sortOrder: 5 }));
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 5 }),
    });
  });
});
